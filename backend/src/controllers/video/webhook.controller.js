const Appointment = require('../../models/appointment/appointment.model');
const Tenant = require('../../models/tenant/tenant.model');
const { parseRoomIdForAppointment, isHost } = require('../../utils/zegocloud');
const AppError = require('../../utils/appError');

/**
 * Handle ZEGOCLOUD room.user.enter/leave webhook
 * Updates appointment.meeting.participants[].joinEvents as source of truth
 */
exports.handleZegoWebhook = async (req, res, next) => {
  try {
    const { event } = req.body; // { name: 'room.user.enter|leave', data: { room_id, user_id, user_name?, timestamp, duration? } }

    if (!event || !['room.user.enter', 'room.user.leave'].includes(event.name)) {
      return res.status(400).json({ error: 'Invalid ZEGOCLOUD event' });
    }

    const { room_id: roomId, user_id: userId, user_name: userName, timestamp } = event.data;
    const now = timestamp ? new Date(Number(timestamp)) : new Date();
    const action = event.name === 'room.user.enter' ? 'join' : 'leave';

    // Parse appointmentId from roomId
    const appointmentId = await parseRoomIdForAppointment(roomId);
    if (!appointmentId) {
      console.warn(`Webhook: No appointment found for roomId ${roomId}`);
      return res.status(200).json({ message: 'No matching appointment' });
    }

    // Fetch appointment & tenant
    const appointment = await Appointment.findById(appointmentId).populate('tenantId');
    if (!appointment || appointment.mode !== 'online' || !appointment.meeting?.roomId || appointment.meeting.status === 'ended') {
      return res.status(200).json({ message: 'Appointment inactive' });
    }

    if (roomId !== appointment.meeting.roomId) {
      console.warn(`Webhook roomId mismatch: ${roomId} vs ${appointment.meeting.roomId}`);
      return res.status(200).json({ message: 'Room mismatch' });
    }

    // Upsert participant & append event
    appointment.meeting.participants = appointment.meeting.participants || [];
    let participant = appointment.meeting.participants.find(p => p.userId?.toString() === userId);
    
    if (!participant) {
      const tenant = await Tenant.findById(appointment.tenantId);
      const role = tenant?.ownerId?.toString() === userId ? 'host' : 'participant';
      
      participant = {
        userId: new mongoose.Types.ObjectId(userId),
        userName: userName || `User_${userId.slice(-4)}`,
        role,
        joinEvents: []
      };
      appointment.meeting.participants.push(participant);
    }

    participant.joinEvents.push({ at: now, action });
    
    // Set first-join flags (lifecycle jobs rely on these)
    if (!appointment.meeting.hostJoinedAt && participant.role === 'host') {
      appointment.meeting.hostJoinedAt = now;
    }
    if (!appointment.meeting.attendeeJoinedAt && participant.role === 'participant') {
      appointment.meeting.attendeeJoinedAt = now;
    }

// Start meeting if host joins\n    if (participant.role === 'host' && !appointment.meeting.startedAt) {\n      appointment.meeting.startedAt = now;\n      appointment.meeting.status = 'live';\n    }\n\n    // Auto-complete if last leave + sufficient time passed (trigger status change)\n    const nowSeconds = now.getTime() / 1000;\n    const recentJoins = appointment.meeting.participants.some(p => \n      p.joinEvents.some(e => e.action === 'leave' && (nowSeconds*1000 - new Date(e.at).getTime()) < 5*60*1000)\n    );\n    if (action === 'leave' && !recentJoins && appointment.meeting.startedAt && now > new Date(appointment.endTimeUTC)) {\n      const { computeDurationSeconds, getParticipantDurations } = require('../../jobs/appointmentLifecycle.job');\n      const { hostDuration, maxAttendeeDuration } = getParticipantDurations(appointment, now);\n      const MIN_SECONDS = 60;\n      const hostOk = hostDuration >= MIN_SECONDS;\n      const attendeeOk = maxAttendeeDuration >= MIN_SECONDS;\n      \n      appointment.meeting.endedAt = now;\n      appointment.meeting.status = 'ended';\n      \n      if (hostOk && attendeeOk) {\n        appointment.status = 'auto_completed';\n        appointment.completedAt = now;\n      } else if (hostOk && !attendeeOk) {\n        appointment.status = 'customer_no_show';\n      } else if (!hostOk && attendeeOk) {\n        appointment.status = 'provider_no_show';\n      } else {\n        appointment.status = 'both_no_show';\n      }\n      appointment.noShowMarkedAt = now;\n      appointment.noShowMarkedBySystem = true;\n    }\n\n    await appointment.save();\n\n    console.log(`Webhook [${action}] room:${roomId.slice(-8)} appt:${appointmentId} user:${userId.slice(-4)} role:${participant.role}`);\n\n    res.status(200).json({ success: true, action, appointmentId: appointmentId.toString() });
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
};


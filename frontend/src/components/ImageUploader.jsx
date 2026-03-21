import { useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "../auth/useAuth";
import { getUploadSignature } from "../pages/serviceProvider/api/providerApi";
import LazyImage from "./LazyImage";
import { applyCloudinaryTransform, formatBytes } from "../utils/cloudinary";

const MAX_FILES_DEFAULT = 6;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function ImageUploader({
  label = "Images",
  value = [],
  onChange = () => {},
  folder = "services",
  maxFiles = MAX_FILES_DEFAULT,
  disabled = false,
}) {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeUploads, setActiveUploads] = useState(0);
  const [queue, setQueue] = useState([]);

  const remainingSlots = Math.max(0, maxFiles - value.length);

  const pushMessage = (message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 3500);
  };

  const updateQueueItem = (id, updates) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleFiles = (fileList) => {
    if (!fileList?.length || disabled) return;
    if (!token) {
      pushMessage("Login required before uploading.");
      return;
    }

    const allowed = Array.from(fileList).slice(0, remainingSlots);
    if (allowed.length === 0) {
      pushMessage("Maximum image limit reached.");
      return;
    }

    allowed.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        pushMessage("Only image files are allowed.");
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        pushMessage(`File too large (${formatBytes(file.size)}). Max 5MB.`);
        return;
      }

      uploadFile(file);
    });
  };

  const uploadFile = async (file) => {
    const id = `${file.name}-${file.lastModified}-${Math.random()
      .toString(16)
      .slice(2)}`;

    setQueue((prev) => [
      ...prev,
      {
        id,
        name: file.name,
        size: file.size,
        progress: 2,
        status: "signing",
      },
    ]);
    setActiveUploads((count) => count + 1);

    try {
      const signaturePayload = await getUploadSignature({
        token,
        folder,
        fileType: file.type,
        fileSize: file.size,
      });

      updateQueueItem(id, { status: "uploading", maxSize: signaturePayload.maxFileSize });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signaturePayload.apiKey);
      formData.append("timestamp", signaturePayload.timestamp);
      formData.append("signature", signaturePayload.signature);
      formData.append("folder", signaturePayload.folder || folder);
      if (signaturePayload.eager) {
        formData.append("eager", signaturePayload.eager);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/image/upload`;

      const response = await axios.post(uploadUrl, formData, {
        onUploadProgress: (event) => {
          const percent = event.total
            ? Math.round((event.loaded / event.total) * 100)
            : 30;
          updateQueueItem(id, { progress: percent, status: "uploading" });
        },
      });

      const secureUrl =
        response.data?.eager?.[0]?.secure_url || response.data?.secure_url;
      updateQueueItem(id, { progress: 100, status: "done" });

      if (secureUrl) {
        const next = Array.from(new Set([...(value || []), secureUrl]));
        onChange(next);
      }
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Upload failed. Try again.";
      updateQueueItem(id, { status: "error", error: message });
      pushMessage(message);
    } finally {
      setActiveUploads((count) => Math.max(0, count - 1));
      setQueue((prev) => prev.filter((item) => item.id !== id || item.status !== "done"));
    }
  };

  return (
    <div className="uploader">
      <div className="uploader-head">
        <div>
          <p className="uploader-label">{label}</p>
          <p className="uploader-helper">
            Drag & drop images (max 5MB each). Stored securely in Cloudinary.
          </p>
        </div>
        <span className="uploader-count">
          {value.length}/{maxFiles}
        </span>
      </div>

      <div
        className={`uploader-dropzone${isDragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        onClick={() => {
          if (inputRef.current && !disabled) {
            inputRef.current.click();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (inputRef.current && !disabled) {
              inputRef.current.click();
            }
          }
        }}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <div>
          <p className="uploader-cta">Click or drop to upload</p>
          <p className="uploader-sub">
            Files go to <strong>{folder}/</strong> with optimized delivery (f_auto, q_auto, w_500)
          </p>
          {activeUploads > 0 ? (
            <p className="uploader-status">
              <span className="spinner" /> Uploading {activeUploads} file
              {activeUploads > 1 ? "s" : ""}...
            </p>
          ) : null}
        </div>
      </div>

      {queue.length > 0 ? (
        <div className="upload-progress-list">
          {queue.map((item) => (
            <div key={item.id} className="upload-progress">
              <div className="upload-progress-head">
                <span>{item.name}</span>
                <span className="muted-text">
                  {formatBytes(item.size)} · {item.status}
                </span>
              </div>
              <div className="upload-progress-bar">
                <span style={{ width: `${item.progress}%` }} />
              </div>
              {item.error ? <p className="error-text">{item.error}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {value?.length ? (
        <div className="upload-preview-grid">
          {value.map((url) => (
            <div className="upload-thumb" key={url}>
              <LazyImage
                src={applyCloudinaryTransform(url)}
                alt="Uploaded preview"
                height={140}
              />
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() =>
                  onChange(value.filter((item) => item !== url))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-text">No images uploaded yet.</p>
      )}

      {statusMessage ? <p className="error-text">{statusMessage}</p> : null}
    </div>
  );
}

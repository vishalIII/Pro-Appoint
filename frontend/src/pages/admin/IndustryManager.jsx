import { useEffect, useState } from "react";
import {
  createIndustry,
  deleteIndustry,
  fetchIndustries,
  toggleIndustryStatus,
  updateIndustry,
} from "../../api/adminApi";

export default function IndustryManagerPage() {
  const [industries, setIndustries] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchIndustries();
      setIndustries(data);
    } catch (err) {
      setError(err.message || "Failed to load industries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await createIndustry(trimmed);
      setName("");
      await load();
    } catch (err) {
      setError(err.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id, value) => {
    try {
      await updateIndustry(id, { name: value });
      await load();
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Update failed");
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleIndustryStatus(id);
      await load();
    } catch (err) {
      setError(err.message || "Toggle failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this industry?")) return;
    try {
      await deleteIndustry(id);
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <section className="card">
      <div className="dashboard-header">
        <div className="dashboard-header-main">
          <h3>Industries</h3>
          <p className="muted-text">Controls the departments shown on the public homepage.</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <form className="actions-row" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Add new industry"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!name.trim() || loading}>
          Add
        </button>
      </form>

      {loading ? <p>Loading…</p> : null}

      <div className="provider-table-wrap" style={{ marginTop: 12 }}>
        <table className="provider-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {industries.map((industry) => (
              <tr key={industry._id}>
                <td>
                  {editingId === industry._id ? (
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span>{industry.name}</span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${industry.isActive ? "green" : "slate"}`}>
                    {industry.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="provider-action-row">
                    <button
                      className="btn btn-small"
                      type="button"
                      onClick={() => handleToggle(industry._id)}
                    >
                      {industry.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      type="button"
                      onClick={() => handleDelete(industry._id)}
                    >
                      Delete
                    </button>
                    {editingId === industry._id ? (
                      <>
                        <button
                          className="btn btn-small"
                          type="button"
                          onClick={() => handleRename(industry._id, draftName.trim())}
                          disabled={!draftName.trim()}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-secondary btn-small"
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setDraftName("");
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-small"
                        type="button"
                        onClick={() => {
                          setEditingId(industry._id);
                          setDraftName(industry.name || "");
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

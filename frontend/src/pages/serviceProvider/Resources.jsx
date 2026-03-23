import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import {
  createShopResource,
  deleteShopResource,
  fetchShopResources,
  updateShopResource,
} from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";

const initialForm = {
  name: "",
  type: "staff",
  capacity: "1",
};

export default function ProviderResourcesPage() {
  const { token } = useAuth();
  const { shopId: routeShopId } = useParams();
  const { selectedShopId, setSelectedShopId, activeShop } = useProviderWorkspace();
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState("");
  const [editingResource, setEditingResource] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", capacity: "1" });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (routeShopId && routeShopId !== selectedShopId) {
      setSelectedShopId(routeShopId);
    }
  }, [routeShopId, selectedShopId, setSelectedShopId]);

  const loadResources = useCallback(async () => {
    if (!token || !selectedShopId) {
      setResources([]);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const payload = await fetchShopResources({
        token,
        shopId: selectedShopId,
      });
      setResources(Array.isArray(payload?.resources) ? payload.resources : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load resources");
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedShopId, token]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!selectedShopId) return;
    setIsSubmitting(true);
    setError("");

    try {
      await createShopResource({
        token,
        shopId: selectedShopId,
        payload: {
          name: form.name,
          type: form.type,
          capacity: Number(form.capacity),
        },
      });
      setForm(initialForm);
      await loadResources();
    } catch (createError) {
      setError(createError.message || "Failed to create resource");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (resource) => {
    if (!selectedShopId) return;
    setError("");
    try {
      await updateShopResource({
        token,
        shopId: selectedShopId,
        resourceId: resource._id,
        payload: { isActive: !resource.isActive },
      });
      await loadResources();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update resource");
    }
  };

  const handleDelete = async (resourceId) => {
    if (!selectedShopId) return;
    setError("");
    try {
      await deleteShopResource({
        token,
        shopId: selectedShopId,
        resourceId,
      });
      await loadResources();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete resource");
    }
  };

  const handleEdit = async (resource) => {
    setEditingResource(resource);
    setEditForm({ name: resource.name, capacity: String(resource.capacity) });
    setIsEditing(false);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!selectedShopId || !editingResource) return;
    setIsEditing(true);
    setError("");

    try {
      await updateShopResource({
        token,
        shopId: selectedShopId,
        resourceId: editingResource._id,
        payload: {
          name: editForm.name.trim(),
          capacity: Number(editForm.capacity),
        },
      });
      setEditingResource(null);
      setEditForm({ name: "", capacity: "1" });
      await loadResources();
    } catch (editError) {
      setError(editError.message || "Failed to update resource");
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingResource(null);
    setEditForm({ name: "", capacity: "1" });
  };

  if (!selectedShopId) {
    return (
      <section className="provider-page">
        <article className="card">
          <h1>Resources</h1>
          <p className="muted-text">Select a shop from the top header to manage resources.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="provider-page">
      <article className="card">
        <h1>Resources for {activeShop?.shopName || "Selected shop"}</h1>
        {error ? <p className="error-text">{error}</p> : null}

        <form className="provider-inline-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Resource name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value="staff">Staff</option>
            <option value="room">Room</option>
            <option value="chair">Chair</option>
            <option value="equipment">Equipment</option>
          </select>
          <input
            type="number"
            placeholder="Capacity"
            min="1"
            value={form.capacity}
            onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
            required
          />
          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Add Resource"}
          </button>
        </form>

        {isLoading ? <p>Loading resources...</p> : null}
        {!isLoading && resources.length === 0 ? (
          <p className="muted-text">No resources found.</p>
        ) : null}

        {resources.length > 0 ? (
          <div className="provider-table-wrap">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource._id}>
                    <td>{resource.name}</td>
                    <td>{resource.type}</td>
                    <td>{resource.capacity}</td>
                    <td>{resource.isActive ? "Active" : "Inactive"}</td>
                    <td>
                      <div className="provider-action-row">
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => handleToggle(resource)}
                        >
                          {resource.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => handleEdit(resource)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-secondary"
                          onClick={() => handleDelete(resource._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {editingResource && (
          <div className="modal-overlay" onClick={handleCancelEdit}>
            <div className="card modal" onClick={(e) => e.stopPropagation()}>
              <h2>Edit Resource</h2>
              {error ? <p className="error-text">{error}</p> : null}
              <form className="provider-inline-form" onSubmit={handleSaveEdit}>
                <input
                  type="text"
                  placeholder="Resource name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
                <input
                  type="number"
                  placeholder="Capacity"
                  min="1"
                  value={editForm.capacity}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, capacity: e.target.value }))
                  }
                  required
                />
                <button className="btn" type="submit" disabled={isEditing}>
                  {isEditing ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  disabled={isEditing}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

import { useNavigate } from "react-router-dom";

export default function DepartmentsPanel({ departments, isLoadingDepartments, departmentsError }) {
  const navigate = useNavigate();

  const handleDepartmentClick = (department) => {
    navigate(`/shops/by-category/${encodeURIComponent(department)}`);
  };

  return (
    <aside className="departments-panel">
      <div className="departments-title">
        <span>All departments</span>
        <span aria-hidden="true">v</span>
      </div>
      <ul className="departments-list">
        {isLoadingDepartments ? <li className="department-meta">Loading departments...</li> : null}
        {departmentsError ? <li className="department-meta">{departmentsError}</li> : null}
        {!isLoadingDepartments && !departmentsError && departments.length === 0 ? (
          <li className="department-meta">No departments available right now.</li>
        ) : null}
        {departments.map((department) => (
          <li key={department} onClick={() => handleDepartmentClick(department)} style={{ cursor: "pointer" }}>
            {department}
          </li>
        ))}
      </ul>
    </aside>
  );
}

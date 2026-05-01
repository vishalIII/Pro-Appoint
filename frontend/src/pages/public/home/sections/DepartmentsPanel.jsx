import { useNavigate } from "react-router-dom";

export default function DepartmentsPanel({
  departments,
  isLoadingDepartments,
  departmentsError,
}) {
  const navigate = useNavigate();

  const handleDepartmentClick = (department) => {
    const cleanDepartment = department?.trim() || "";

    const params = new URLSearchParams();

    if (cleanDepartment) {
      params.set("service", cleanDepartment); // main filter
      params.set("q", cleanDepartment);       // optional keyword
    }

    navigate(`/search?${params.toString()}`);
  };

  return (
    <aside className="departments-panel">
      <div className="departments-title">
        <span>All departments</span>
        <span aria-hidden="true">v</span>
      </div>

      <ul className="departments-list">
        {isLoadingDepartments && (
          <li className="department-meta">Loading departments...</li>
        )}

        {departmentsError && (
          <li className="department-meta">{departmentsError}</li>
        )}

        {!isLoadingDepartments &&
          !departmentsError &&
          departments.length === 0 && (
            <li className="department-meta">
              No departments available right now.
            </li>
          )}

        {departments.map((department) => (
          <li
            key={department}
            onClick={() => handleDepartmentClick(department)}
            style={{ cursor: "pointer" }}
          >
            {department}
          </li>
        ))}
      </ul>
    </aside>
  );
}
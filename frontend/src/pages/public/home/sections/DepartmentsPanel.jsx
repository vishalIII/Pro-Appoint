export default function DepartmentsPanel({ departments, isLoadingDepartments, departmentsError }) {
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
          <li key={department}>{department}</li>
        ))}
      </ul>
    </aside>
  );
}

export function StatusMini({ status }: { status: string }) {
  function badgeClass(status: string) {
    switch (status) {
      case "OK":
        return "bg-green-100 text-green-800";
      case "INCOMPLETE_KPI_SET":
        return "bg-yellow-100 text-yellow-800";
      case "TAIL":
        return "bg-blue-100 text-blue-800";
      case "UNLINKED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <div className="text-[11px] mt-1">
      <span
        className={`px-2 py-[2px] rounded font-medium ${badgeClass(status)}`}
      >
        {status}
      </span>
    </div>
  );
}
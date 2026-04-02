import { cn } from "@/lib/utils";

type Status =
  | "present"
  | "absent"
  | "late"
  | "paid"
  | "pending"
  | "overdue"
  | "active"
  | "inactive";

interface StatusBadgeProps {
  status: Status;
  labelOverride?: string;
}

const StatusBadge = ({ status, labelOverride }: StatusBadgeProps) => {
  const statusConfig: Record<
    Status,
    { label: string; className: string }
  > = {
    present: {
      label: "Present",
      className: "bg-green-50 text-green-700 border border-green-200",
    },
    absent: {
      label: "Absent",
      className: "bg-red-50 text-red-700 border border-red-200",
    },
    late: {
      label: "Late",
      className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    },
    paid: {
      label: "Paid",
      className: "bg-green-50 text-green-700 border border-green-200",
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-50 text-red-700 border border-red-200",
    },
    active: {
      label: "Active",
      className: "bg-blue-50 text-blue-700 border border-blue-200",
    },
    inactive: {
      label: "Inactive",
      className: "bg-gray-50 text-gray-600 border border-gray-200",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
        config.className
      )}
    >
      {labelOverride ?? config.label}
    </span>
  );
};

export default StatusBadge;

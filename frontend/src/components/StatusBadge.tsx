import React from 'react';

interface StatusBadgeProps {
  status: string;
  isOverdue?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isOverdue }) => {
  const s = status.toLowerCase();

  if (isOverdue) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-pulse"></span>
        Overdue
      </span>
    );
  }

  let colorClasses = "bg-slate-100 text-slate-800 border-slate-200";
  let dotColor = "bg-slate-400";

  switch (s) {
    case 'draft':
      colorClasses = "bg-slate-100 text-slate-700 border-slate-200";
      dotColor = "bg-slate-400";
      break;
    case 'quotation':
      colorClasses = "bg-blue-100 text-blue-800 border-blue-200";
      dotColor = "bg-blue-500";
      break;
    case 'confirmed':
      colorClasses = "bg-indigo-100 text-indigo-800 border-indigo-200";
      dotColor = "bg-indigo-500";
      break;
    case 'active':
    case 'paid':
      colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-200";
      dotColor = "bg-emerald-500";
      break;
    case 'paused':
      colorClasses = "bg-amber-100 text-amber-800 border-amber-200";
      dotColor = "bg-amber-500";
      break;
    case 'closed':
    case 'cancelled':
      colorClasses = "bg-rose-50 text-rose-700 border-rose-200";
      dotColor = "bg-rose-500";
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`}></span>
      {status}
    </span>
  );
};


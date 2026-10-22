import React, { useState } from "react";
import { Bell } from "lucide-react";

export const NotificationsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h1>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl text-center text-slate-500">
        <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p>Notification system is currently under development.</p>
      </div>
    </div>
  );
};

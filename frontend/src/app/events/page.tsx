import React from "react";
import EventsList from "../../components/events/EventsList";
import { DashboardLayout } from "../../components/layout";

export default function EventsPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <EventsList />
      </div>
    </DashboardLayout>
  );
}

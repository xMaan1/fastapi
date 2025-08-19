"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Clock, Play, Square, Timer, Calendar, BarChart3 } from "lucide-react";
import { DashboardLayout } from "../../components/layout";

export default function TimeTrackingPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00:00");

  const toggleTracking = () => {
    setIsTracking(!isTracking);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Time Tracking
          </h1>
          <p className="text-gray-600 mt-2">
            Track your time and manage productivity
          </p>
        </div>

        {/* Current Timer */}
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-6">
              <div className="text-6xl font-mono font-bold text-gray-900">
                {currentTime}
              </div>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={toggleTracking}
                  className={
                    isTracking ? "bg-red-600 hover:bg-red-700" : "modern-button"
                  }
                >
                  {isTracking ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
              {isTracking && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  Currently tracking
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">8.5h</p>
                  <p className="text-sm text-gray-600">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">42.5h</p>
                  <p className="text-sm text-gray-600">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">168h</p>
                  <p className="text-sm text-gray-600">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((session) => (
                <div
                  key={session}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">Project Work</h4>
                    <p className="text-sm text-gray-600">Website Redesign</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-gray-900">2:30:45</p>
                    <p className="text-sm text-gray-600">Today</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

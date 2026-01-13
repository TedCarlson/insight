import React from "react";

type PersonAssignmentCardProps = {
    personName: string;
    role: "Hires" | "Contractors";
    active: boolean;
    organization: string | null;
    techId: string | null;
    positionTitle: string | null;
    startDate: string;
    endDate: string | null;
    primaryOffice: string | null;
};

export default function PersonAssignmentCard({
    personName,
    role,
    active,
    organization,
    techId,
    positionTitle,
    startDate,
    endDate,
    primaryOffice,
}: PersonAssignmentCardProps) {
    return (
        <div className="p-4 rounded-2xl shadow bg-white space-y-2 text-sm">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{personName}</h2>
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                        }`}
                >
                    {active ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="text-gray-600">
                <p><strong>Role:</strong> {role}</p>
                <p><strong>Org:</strong> {organization || "—"}</p>
                <p><strong>Tech ID:</strong> {techId || "—"}</p>
                <p><strong>Position:</strong> {positionTitle || "—"}</p>
                <p><strong>Start:</strong> {startDate}</p>
                <p><strong>End:</strong> {endDate || "—"}</p>
                <p><strong>Office:</strong> {primaryOffice || "—"}</p>
            </div>
        </div>
    );
}

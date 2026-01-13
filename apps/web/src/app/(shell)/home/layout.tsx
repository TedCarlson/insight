// apps/web/src/app/(shell)/home/layout.tsx

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-4">
            {children}
        </div>
    );
}

// apps/web/src/app/(shell)/home/page.tsx

export default function HomePage() {
    const tiles = [
        {
            title: "App Overview",
            description: "System purpose, modules, and scope summary.",
        },
        {
            title: "Data Status",
            description: "Show recent syncs, table counts, or feed alerts.",
        },
        {
            title: "Next Actions",
            description: "Pending tasks, migrations, or ownership setup.",
        },
    ];

    return (
        <main className="p-6">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tiles.map(({ title, description }) => (
                    <div
                        key={title}
                        className="rounded-2xl shadow-md hover:shadow-lg transition bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-6"
                    >
                        <h2 className="text-xl font-semibold mb-2">{title}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
                        <button className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            View Details
                        </button>
                    </div>
                ))}
            </section>
        </main>
    );
}

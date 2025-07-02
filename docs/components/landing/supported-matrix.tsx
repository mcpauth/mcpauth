import { CheckCircle2 } from 'lucide-react';
import { SiNextdotjs, SiExpress, SiHono, SiMysql, SiPostgresql, SiDrizzle, SiPrisma, SiSqlite } from 'react-icons/si';

const adapters = [
  { name: 'Next.js', icon: <SiNextdotjs className="w-6 h-6" /> },
  { name: 'Express', icon: <SiExpress className="w-6 h-6" /> },
  { name: 'Hono', icon: <SiHono className="w-6 h-6" /> },
];

const stores = [
  { name: 'MySQL', icon: <SiMysql className="w-6 h-6" /> },
  { name: 'Postgres', icon: <SiPostgresql className="w-6 h-6" /> },
  { name: 'Drizzle', icon: <SiDrizzle className="w-6 h-6" /> },
  { name: 'Prisma', icon: <SiPrisma className="w-6 h-6" /> },
  { name: 'SQLite', icon: <SiSqlite className="w-6 h-6" /> },
];

export default function SupportedMatrix() {
  return (
    <div className="w-full overflow-x-auto">
        <table className="w-full min-w-max text-left border-collapse">
            <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-4"></th>
                    {stores.map((store) => (
                        <th key={store.name} className="p-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                                {store.icon}
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{store.name}</span>
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {adapters.map((adapter) => (
                    <tr key={adapter.name} className="border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
                        <td className="p-4">
                            <div className="flex items-center gap-3">
                                {adapter.icon}
                                <span className="font-semibold">{adapter.name}</span>
                            </div>
                        </td>
                        {stores.map((store) => (
                            <td key={store.name} className="p-4 text-center">
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
}

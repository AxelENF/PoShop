import React from 'react';

export default function AdminPage() {
  const stats = [
    { title: 'Tenants Activos', value: '142', change: '+12% este mes', icon: '🏢' },
    { title: 'Revendedores Certificados', value: '38', change: '+4 en campo', icon: '🛠️' },
    { title: 'MRR Acumulado', value: '$68,430 MXN', change: '+8% vs mes anterior', icon: '📈' },
    { title: 'Licencias Lifetime', value: '14', change: '$167,664 MXN en caja', icon: '💎' },
  ];

  return (
    <div className="min-h-screen p-8 flex flex-col justify-between" style={{ background: '#09090b' }}>
      <div>
        {/* Navigation Bar */}
        <header className="flex justify-between items-center mb-12 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">SNAPGAD</span>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-semibold">
              SUPERADMIN PANEL
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            Última sincronización: Hace 1 minuto
          </div>
        </header>

        {/* Dashboard Grid */}
        <main className="max-w-6xl mx-auto w-full">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Gobernanza de Operaciones</h1>
            <p className="text-zinc-400 text-sm mt-1">Monitorea el crecimiento del canal de distribución y el performance de licenciamiento en tiempo real.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{stat.title}</h3>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions & Recent Logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h2 className="text-lg font-bold text-white mb-4">Acciones de Control Directo</h2>
              <div className="flex flex-col gap-3">
                <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🆕 Registrar Nuevo Partner (Revendedor/Afiliado)
                </button>
                <button style={{ background: 'transparent', color: '#e4e4e7', border: '1px solid #3f3f46', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🔑 Generar Licencia Permanente (Lifetime Key)
                </button>
                <button style={{ background: 'transparent', color: '#e4e4e7', border: '1px solid #3f3f46', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ⚙️ Configurar Parámetros del SAT (Timbrado global)
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h2 className="text-lg font-bold text-white mb-4">Actividad Reciente del Canal</h2>
              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3 bg-zinc-950 rounded border border-zinc-800/50 flex justify-between">
                  <span className="text-zinc-300">🏢 Nuevo Tenant registrado: **Cremería El Torito** (Puebla)</span>
                  <span className="text-zinc-500">Hace 3m</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded border border-zinc-800/50 flex justify-between">
                  <span className="text-zinc-300">🛠️ Partner **Carlos Mendoza** aprobó certificación Nivel 2</span>
                  <span className="text-zinc-500">Hace 2h</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded border border-zinc-800/50 flex justify-between">
                  <span className="text-zinc-300">💎 Pago Lifetime procesado: **Ferretería La Central** ($11,976 MXN)</span>
                  <span className="text-zinc-500">Hace 4h</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="text-center text-xs text-zinc-600 mt-16 pt-6 border-t border-zinc-800/30">
        SNAPGAD POS Admin &copy; {new Date().getFullYear()} &middot; Panel de operaciones internas.
      </footer>
    </div>
  );
}

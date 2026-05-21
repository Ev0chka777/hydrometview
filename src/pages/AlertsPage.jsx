import { useState } from 'react'
import { Bell, Filter, CheckCheck } from 'lucide-react'
import AlertItem from '../components/AlertItem'
import { alerts } from '../data/mockData'
import clsx from 'clsx'

const FILTERS = ['Все', 'Критические', 'Предупреждения', 'Информация', 'Непрочитанные']

const card =
  'bg-white dark:bg-[#131E36]/80 border border-slate-200/70 dark:border-white/[0.04] ' +
  'shadow-sm dark:shadow-xl shadow-slate-900/[0.04] dark:shadow-black/20 transition-colors duration-200'

export default function AlertsPage() {
  const [filter, setFilter] = useState('Все')
  const [list, setList] = useState(alerts)

  const filtered = list.filter(a => {
    if (filter === 'Критические') return a.type === 'critical'
    if (filter === 'Предупреждения') return a.type === 'warning'
    if (filter === 'Информация') return a.type === 'info'
    if (filter === 'Непрочитанные') return !a.acknowledged
    return true
  })

  function markAll() {
    setList(list.map(a => ({ ...a, acknowledged: true })))
  }

  const unread = list.filter(a => !a.acknowledged).length
  const critical = list.filter(a => a.type === 'critical').length
  const warning = list.filter(a => a.type === 'warning').length

  const stats = [
    { label: 'Всего', value: list.length, tone: 'text-slate-900 dark:text-white' },
    { label: 'Критических', value: critical, tone: 'text-red-600 dark:text-red-400' },
    { label: 'Предупреждений', value: warning, tone: 'text-amber-600 dark:text-amber-400' },
    { label: 'Непрочитанных', value: unread, tone: 'text-[#2F80FF] dark:text-blue-300' },
  ]

  return (
    <div className="space-y-6">
      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value, tone }) => (
          <div key={label} className={`${card} rounded-2xl p-4`}>
            <div className={clsx('text-3xl font-bold transition-colors duration-200', tone)}>{value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ===== Filter + actions ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" strokeWidth={2.2} />
          {FILTERS.map(f => {
            const active = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-200',
                  active
                    ? 'bg-blue-50 text-[#2F80FF] border-[#2F80FF]/40 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 ' +
                      'dark:bg-[#1A2540]/80 dark:text-slate-300 dark:border-white/[0.06] dark:hover:border-white/[0.16] dark:hover:text-white'
                )}
              >
                {f}
                {f === 'Непрочитанные' && unread > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5">
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors duration-200
                       bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50
                       dark:bg-[#1A2540]/80 dark:text-slate-200 dark:border-white/[0.06] dark:hover:bg-[#22305A]"
          >
            <CheckCheck className="w-4 h-4" strokeWidth={2.2} />
            Прочитать все
          </button>
        )}
      </div>

      {/* ===== List ===== */}
      {filtered.length === 0 ? (
        <div className={`${card} rounded-3xl p-12 text-center`}>
          <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" strokeWidth={2.2} />
          <p className="text-slate-500 dark:text-slate-400 transition-colors duration-200">
            Нет оповещений по выбранному фильтру
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}

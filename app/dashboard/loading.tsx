export default function DashboardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
      </div>
    </div>
  )
}

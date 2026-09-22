import { useState } from 'react';
import { useAuditLogs } from '../../features/auditLogs/hooks/useAuditLogs.js';
import { AuditLogFilterBar } from '../../features/auditLogs/components/AuditLogFilterBar.jsx';
import { AuditLogTable } from '../../features/auditLogs/components/AuditLogTable.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useActiveOrganization } from '../../hooks/useActiveOrganization.js';
import { extractErrorMessage } from '../../lib/axios.js';

export function AuditLogPage() {
  const { organizationId } = useActiveOrganization();
  const [searchInput, setSearchInput] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchInput);
  const filters = {
    page,
    limit: 20,
    search: search || undefined,
    action: action || undefined,
    entityType: entityType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading, isError, error } = useAuditLogs(organizationId, filters);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Audit Log</h1>

      <AuditLogFilterBar
        search={searchInput}
        onSearchChange={resetPage(setSearchInput)}
        action={action}
        onActionChange={resetPage(setAction)}
        entityType={entityType}
        onEntityTypeChange={resetPage(setEntityType)}
        dateFrom={dateFrom}
        onDateFromChange={resetPage(setDateFrom)}
        dateTo={dateTo}
        onDateToChange={resetPage(setDateTo)}
      />

      {isError && <Alert tone="error">{extractErrorMessage(error, 'Could not load audit log')}</Alert>}
      {isLoading && <Spinner />}

      {data && data.data.length === 0 && (
        <EmptyState title="No activity found" description="Try a different search, filter, or date range." />
      )}

      {data && data.data.length > 0 && <AuditLogTable logs={data.data} />}

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}

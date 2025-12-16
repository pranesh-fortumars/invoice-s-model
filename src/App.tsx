import { useMemo, useState } from 'react'
import './App.css'
import {
  ACTIVITY_LOG,
  CLIENT_DIRECTORY,
  INVOICE_LEDGER,
  ORGANIZATION,
  SERVICE_CATALOG,
  TEAM_MEMBERS,
} from './data'
import type { ActivityLog, InvoiceRecord, InvoiceStatus } from './types'
import { InvoiceBuilder } from './components/InvoiceBuilder'

type AppView = 'overview' | 'invoices' | 'builder' | 'clients' | 'team' | 'settings'

const statusTone: Record<InvoiceStatus, string> = {
  Draft: 'draft',
  Pending: 'pending',
  Paid: 'paid',
  Overdue: 'overdue',
}

const summarize = (records: InvoiceRecord[]) => {
  const totals = records.reduce(
    (acc, inv) => {
      acc.overall += inv.amount
      acc[inv.status] += inv.amount
      if (inv.status === 'Pending' || inv.status === 'Overdue') {
        acc.outstanding += inv.amount
      }
      return acc
    },
    {
      overall: 0,
      outstanding: 0,
      Draft: 0,
      Pending: 0,
      Paid: 0,
      Overdue: 0,
    } satisfies Record<InvoiceStatus | 'overall' | 'outstanding', number>,
  )
  const count = records.length
  return { totals, count }
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('overview')

  const overviewStats = useMemo(() => summarize(INVOICE_LEDGER), [])
  const recentInvoices = useMemo(
    () =>
      [...INVOICE_LEDGER]
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
        .slice(0, 5),
    [],
  )

  const filteredInvoices = useMemo(() => {
    if (activeView === 'invoices') {
      return INVOICE_LEDGER
    }
    if (activeView === 'overview') {
      return recentInvoices
    }
    if (activeView === 'builder') {
      return []
    }
    return INVOICE_LEDGER
  }, [activeView, recentInvoices])

  const renderStatusChip = (status: InvoiceStatus) => (
    <span className={`status-chip ${statusTone[status]}`}>{status}</span>
  )

  const renderActivity = (activity: ActivityLog) => (
    <div key={activity.id} className="activity-row">
      <div>
        <p className="activity-label">{activity.summary}</p>
        <span className="activity-meta">
          {new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(activity.timestamp))}
          {' • '}
          {activity.actor}
        </span>
      </div>
      <span className={`activity-type ${activity.activityType}`}>{activity.activityType}</span>
    </div>
  )

  const renderContent = () => {
    if (activeView === 'builder') {
      return <InvoiceBuilder />
    }

    if (activeView === 'invoices') {
      return (
        <section className="module-card">
          <header className="module-heading">
            <div>
              <h2>All invoices</h2>
              <p>Monitor billing progress across engagements and status buckets.</p>
            </div>
            <button type="button" className="primary" onClick={() => setActiveView('builder')}>
              Create invoice
            </button>
          </header>
          <div className="invoice-table">
            <div className="table-head">
              <span>Invoice</span>
              <span>Client</span>
              <span>Engagement</span>
              <span>Issued</span>
              <span>Due</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {filteredInvoices.map((invoice) => {
              const client = CLIENT_DIRECTORY.find((c) => c.id === invoice.clientId)
              return (
                <div key={invoice.id} className="table-row invoice">
                  <span>
                    <strong>{invoice.invoiceNumber}</strong>
                    <small>{invoice.currency}</small>
                  </span>
                  <span>{client?.companyName ?? '—'}</span>
                  <span>{invoice.engagement}</span>
                  <span>{invoice.issueDate}</span>
                  <span>{invoice.dueDate}</span>
                  <span>{renderStatusChip(invoice.status)}</span>
                  <span>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: invoice.currency,
                      maximumFractionDigits: 0,
                    }).format(invoice.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )
    }

    return (
      <div className="overview-grid">
        <section className="module-card span-2">
          <header className="module-heading">
            <div>
              <h2>Invoice health overview</h2>
              <p>A snapshot of receivables, fulfilment status, and collection risk.</p>
            </div>
            <button type="button" className="outline" onClick={() => setActiveView('invoices')}>
              View all invoices
            </button>
          </header>
          <div className="stat-grid">
            <div className="stat-card primary">
              <span className="label">Outstanding receivables</span>
              <strong>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                  overviewStats.totals.outstanding,
                )}
              </strong>
              <p>Includes pending and overdue invoices awaiting collection.</p>
            </div>
            <div className="stat-card">
              <span className="label">Draft</span>
              <strong>{overviewStats.totals.Draft.toLocaleString('en-IN')}</strong>
              <p>Value of invoices saved but not shared with clients.</p>
            </div>
            <div className="stat-card">
              <span className="label">Pending approval</span>
              <strong>{overviewStats.totals.Pending.toLocaleString('en-IN')}</strong>
              <p>Invoiced amounts awaiting client confirmation.</p>
            </div>
            <div className="stat-card">
              <span className="label">Collected</span>
              <strong>{overviewStats.totals.Paid.toLocaleString('en-IN')}</strong>
              <p>Confirmed payments received this quarter.</p>
            </div>
            <div className="stat-card warning">
              <span className="label">Overdue</span>
              <strong>{overviewStats.totals.Overdue.toLocaleString('en-IN')}</strong>
              <p>Requires immediate follow-up from collections team.</p>
            </div>
          </div>
        </section>

        <section className="module-card">
          <header className="module-heading">
            <div>
              <h2>Recent invoices</h2>
              <p>Latest invoices sent to strategic accounts.</p>
            </div>
          </header>
          <div className="invoice-list">
            {recentInvoices.map((invoice) => {
              const client = CLIENT_DIRECTORY.find((c) => c.id === invoice.clientId)
              return (
                <article key={invoice.id} className="invoice-card">
                  <header>
                    <div>
                      <h3>{invoice.invoiceNumber}</h3>
                      <span>{client?.companyName ?? '—'}</span>
                    </div>
                    {renderStatusChip(invoice.status)}
                  </header>
                  <p>{invoice.engagement}</p>
                  <footer>
                    <span>
                      Issued {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(invoice.issueDate))}
                    </span>
                    <strong>
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: invoice.currency,
                        maximumFractionDigits: 0,
                      }).format(invoice.amount)}
                    </strong>
                  </footer>
                </article>
              )
            })}
          </div>
        </section>

        <section className="module-card">
          <header className="module-heading">
            <div>
              <h2>Operational updates</h2>
              <p>Key actions from finance, delivery, and collections.</p>
            </div>
          </header>
          <div className="activity-feed">{ACTIVITY_LOG.map((activity) => renderActivity(activity))}</div>
        </section>

        <section className="module-card span-2">
          <header className="module-heading">
            <div>
              <h2>Service catalogue</h2>
              <p>Standard billing packages across our practice areas.</p>
            </div>
          </header>
          <div className="service-grid">
            {SERVICE_CATALOG.map((service) => (
              <article key={service.id} className="service-card">
                <header>
                  <h3>{service.name}</h3>
                  <span className="service-category">{service.category}</span>
                </header>
                <p>{service.description}</p>
                <footer>
                  <span>{service.unit}</span>
                  <strong>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(service.unitRate)}
                  </strong>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <section className="module-card">
          <header className="module-heading">
            <div>
              <h2>Finance squad</h2>
              <p>Specialists coordinating billing, strategy, and delivery.</p>
            </div>
          </header>
          <div className="team-grid">
            {TEAM_MEMBERS.map((member) => (
              <article key={member.id} className="team-card">
                <div className="avatar" style={{ backgroundColor: member.avatarColor }}>
                  {member.initials}
                </div>
                <div className="team-details">
                  <h3>{member.name}</h3>
                  <span>{member.role}</span>
                  <p>{member.email}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="glyph">A</span>
          <div>
            <p className="muted">Aurora Digital Solutions</p>
            <strong>Billing Desk</strong>
          </div>
        </div>
        <nav className="nav-group">
          <p className="nav-label">Overview</p>
          <button
            type="button"
            className={activeView === 'overview' ? 'active' : ''}
            onClick={() => setActiveView('overview')}
          >
            Executive summary
          </button>
          <button
            type="button"
            className={activeView === 'invoices' ? 'active' : ''}
            onClick={() => setActiveView('invoices')}
          >
            Invoice ledger
          </button>
          <button
            type="button"
            className={activeView === 'builder' ? 'active' : ''}
            onClick={() => setActiveView('builder')}
          >
            Create invoice
          </button>
        </nav>
        <nav className="nav-group">
          <p className="nav-label">Operations</p>
          <button type="button" className={activeView === 'clients' ? 'active disabled' : 'disabled'}>
            Client profiles
          </button>
          <button type="button" className={activeView === 'team' ? 'active disabled' : 'disabled'}>
            Team workload
          </button>
          <button type="button" className={activeView === 'settings' ? 'active disabled' : 'disabled'}>
            Settings
          </button>
        </nav>
        <footer className="sidebar-footer">
          <p>{ORGANIZATION.contact.email}</p>
          <span>{ORGANIZATION.contact.phone}</span>
        </footer>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="muted">Welcome back, Finance Team</p>
            <h1>{activeView === 'builder' ? 'Generate invoice' : 'Invoice & Billing Command Centre'}</h1>
          </div>
          <button type="button" className="outline" onClick={() => setActiveView('builder')}>
            + New invoice
          </button>
        </header>
        <div className="content-area">{renderContent()}</div>
      </div>
    </div>
  )
}

export default App

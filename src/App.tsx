import { useMemo, useState, useEffect } from 'react'
import './App.css'
import {
  ACTIVITY_LOG,
  CLIENT_DIRECTORY,
  INVOICE_LEDGER,
  ORGANIZATION,
  PAYMENT_GATEWAY,
  PAYMENT_TRANSACTIONS,
  SERVICE_CATALOG,
  SERVICE_SHOWCASES,
  TEAM_MEMBERS,
} from './data'
import type {
  ActivityLog,
  InvoiceRecord,
  InvoiceStatus,
  PaymentGatewayChannel,
  PaymentTransaction,
  ServiceShowcase,
} from './types'
import { InvoiceBuilder } from './components/InvoiceBuilder'

type AppView = 'overview' | 'invoices' | 'builder' | 'clients' | 'team' | 'settings' | 'payments'

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  
  // Check if mobile view on mount and on resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileView(window.innerWidth <= 1024)
    }
    
    // Initial check
    checkIfMobile()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])
  
  // Close mobile menu when view changes
  useEffect(() => {
    if (isMobileView) {
      setIsMobileMenuOpen(false)
    }
  }, [activeView, isMobileView])
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar')
      const menuButton = document.querySelector('.mobile-menu-btn')
      
      if (isMobileView && isMobileMenuOpen && 
          !sidebar?.contains(event.target as Node) && 
          !menuButton?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen, isMobileView])
  
  const toggleMobileMenu = () => {
    if (isMobileView) {
      setIsMobileMenuOpen(!isMobileMenuOpen)
    }
  }

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

  const paymentInsights = useMemo(() => {
    const totalVolume = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Succeeded').reduce(
      (sum, txn) => sum + txn.amount,
      0,
    )
    const successCount = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Succeeded').length
    const failureCount = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Failed').length
    const pendingCount = PAYMENT_TRANSACTIONS.filter((txn) => txn.status === 'Pending').length
    const successRate = PAYMENT_TRANSACTIONS.length
      ? (successCount / PAYMENT_TRANSACTIONS.length) * 100
      : 0
    const recentTransactions = [...PAYMENT_TRANSACTIONS]
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 5)
    return { totalVolume, successRate, failureCount, pendingCount, recentTransactions }
  }, [])

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
    switch (activeView) {
      case 'builder':
        return <InvoiceBuilder />
      case 'invoices':
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
      case 'payments':
        return (
          <div className="operations-grid">
            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Payment gateway control centre</h2>
                  <p>Monitor provider health, channel uptime, and reconciliation windows.</p>
                </div>
                <div className="gateway-actions">
                  <button type="button" className="outline">
                    Test webhook
                  </button>
                  <button type="button" className="primary">
                    Refresh sync
                  </button>
                </div>
              </header>
              <div className="gateway-summary">
                <div>
                  <span className={`gateway-status ${PAYMENT_GATEWAY.status.toLowerCase()}`}>
                    {PAYMENT_GATEWAY.status}
                  </span>
                  <h3>{PAYMENT_GATEWAY.providerName}</h3>
                  <p>Settlement window: {PAYMENT_GATEWAY.settlementWindow}</p>
                </div>
                <div className="summary-grid">
                  <div>
                    <span className="label">Fee structure</span>
                    <strong>{PAYMENT_GATEWAY.feePercentage.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="label">Last sync</span>
                    <strong>
                      {new Intl.DateTimeFormat('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(PAYMENT_GATEWAY.lastSync))}
                    </strong>
                  </div>
                  <div>
                    <span className="label">Reconciliation</span>
                    <strong>{PAYMENT_GATEWAY.reconciliationStatus}</strong>
                  </div>
                  <div>
                    <span className="label">Merchant ID</span>
                    <strong>{PAYMENT_GATEWAY.credentials.merchantId}</strong>
                  </div>
                </div>
                <div className="credential-card">
                  <p>
                    Key ending <strong>{PAYMENT_GATEWAY.credentials.keyEnding}</strong>
                  </p>
                  <p>{PAYMENT_GATEWAY.credentials.webhookUrl}</p>
                </div>
              </div>
              <div className="channel-grid">
                {PAYMENT_GATEWAY.channels.map((channel: PaymentGatewayChannel) => (
                  <article key={channel.id} className="channel-card">
                    <header>
                      <h4>{channel.label}</h4>
                      <span className={`channel-status ${channel.status.toLowerCase()}`}>{channel.status}</span>
                    </header>
                    <div className="channel-metrics">
                      <div>
                        <span className="label">Success rate</span>
                        <strong>{channel.successRate.toFixed(1)}%</strong>
                      </div>
                      <div>
                        <span className="label">Settlement SLA</span>
                        <strong>{channel.slaMinutes} min</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Recent payment activity</h2>
                  <p>Authorised captures and settlements across invoices.</p>
                </div>
              </header>
              <div className="transaction-list">
                {paymentInsights.recentTransactions.map((txn: PaymentTransaction) => {
                  const client = CLIENT_DIRECTORY.find((c) => c.id === txn.clientId)
                  const statusClass = txn.status.toLowerCase()
                  return (
                    <div key={txn.id} className="transaction-row">
                      <div>
                        <h4>{txn.reference}</h4>
                        <span className="txn-meta">
                          Invoice {txn.invoiceId.toUpperCase()} • {client?.companyName ?? '—'}
                        </span>
                      </div>
                      <div className="txn-amount">
                        <strong>
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: txn.currency,
                            maximumFractionDigits: 0,
                          }).format(txn.amount)}
                        </strong>
                        <small>
                          Fee {new Intl.NumberFormat('en-IN', { style: 'currency', currency: txn.currency }).format(txn.feeAmount)}
                        </small>
                      </div>
                      <div className="txn-status-block">
                        <span className={`txn-status ${statusClass}`}>{txn.status}</span>
                        <span className="txn-meta">
                          {new Intl.DateTimeFormat('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(txn.receivedAt))}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )
      case 'clients':
        return (
          <div className="operations-grid">
            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Client portfolio</h2>
                  <p>Profiles of key retainers with contact and contract visibility.</p>
                </div>
                <button type="button" className="outline" onClick={() => setActiveView('builder')}>
                  Draft invoice
                </button>
              </header>
              <div className="client-grid">
                {CLIENT_DIRECTORY.map((client) => (
                  <article key={client.id} className="client-card">
                    <header>
                      <h3>{client.companyName}</h3>
                      <span>{client.contactName}</span>
                    </header>
                    <p className="client-meta">{client.email}</p>
                    <p className="client-meta">{client.phone}</p>
                    <p className="client-meta">
                      {[client.city, client.state].filter(Boolean).join(', ')} • {client.country}
                    </p>
                    {client.gstin ? <span className="chip">GSTIN: {client.gstin}</span> : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )
      case 'team':
        return (
          <div className="operations-grid">
            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Finance squad roster</h2>
                  <p>Billing, collections, and delivery partners with current focus areas.</p>
                </div>
              </header>
              <div className="team-grid detailed">
                {TEAM_MEMBERS.map((member) => (
                  <article key={member.id} className="team-card focus">
                    <div className="avatar" style={{ backgroundColor: member.avatarColor }}>
                      {member.initials}
                    </div>
                    <div className="team-details">
                      <h3>{member.name}</h3>
                      <span>{member.role}</span>
                      <p>{member.email}</p>
                      <div className="chip-row">
                        <span className="chip">Collections</span>
                        <span className="chip">Q2 OKRs</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )
      case 'settings':
        return (
          <div className="operations-grid">
            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Billing console settings</h2>
                  <p>Control payment preferences, reminders, and notification policies.</p>
                </div>
              </header>
              <div className="settings-panel">
                <div className="settings-row">
                  <div>
                    <h3>Auto reminder cadence</h3>
                    <p>Send pending invoice nudges every 5 days until payment is confirmed.</p>
                  </div>
                  <button type="button" className="toggle on">
                    Enabled
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <h3>Attach PDF to emails</h3>
                    <p>Automatically generate and attach branded PDFs for every invoice dispatch.</p>
                  </div>
                  <button type="button" className="toggle">
                    Disabled
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <h3>Dual approval workflow</h3>
                    <p>Route invoices above ₹2,00,000 for finance head approval before release.</p>
                  </div>
                  <button type="button" className="toggle on">
                    Enabled
                  </button>
                </div>
              </div>
            </section>
          </div>
        )
      default:
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

            <section className="module-card span-2">
              <header className="module-heading">
                <div>
                  <h2>Service spotlight</h2>
                  <p>Positioning decks and delivery promises for high-value programs.</p>
                </div>
              </header>
              <div className="service-showcase-grid">
                {SERVICE_SHOWCASES.map((item: ServiceShowcase) => (
                  <article key={item.id} className="service-showcase-card">
                    <header>
                      <h3>{item.headline}</h3>
                      <span>{item.persona}</span>
                    </header>
                    <p>{item.summary}</p>
                    <ul>
                      {item.deliverables.map((deliverable) => (
                        <li key={deliverable}>{deliverable}</li>
                      ))}
                    </ul>
                    <footer>
                      <span>{item.projectedTimeline}</span>
                      <button type="button" className="outline">
                        View proposal
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </section>

            <section className="module-card">
              <header className="module-heading">
                <div>
                  <h2>Gateway performance snapshot</h2>
                  <p>Payments processed through {PAYMENT_GATEWAY.providerName}.</p>
                </div>
                <button type="button" className="outline" onClick={() => setActiveView('payments')}>
                  Manage payments
                </button>
              </header>
              <div className="payment-metrics">
                <div>
                  <span className="label">Success rate</span>
                  <strong>{paymentInsights.successRate.toFixed(1)}%</strong>
                </div>
                <div>
                  <span className="label">Total volume</span>
                  <strong>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                      paymentInsights.totalVolume,
                    )}
                  </strong>
                </div>
                <div>
                  <span className="label">Pending captures</span>
                  <strong>{paymentInsights.pendingCount}</strong>
                </div>
                <div>
                  <span className="label">Failed attempts</span>
                  <strong>{paymentInsights.failureCount}</strong>
                </div>
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
  }

  return (
    <div className="app-shell">
      {isMobileView && (
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      )}
      
      {isMobileView && isMobileMenuOpen && (
        <div 
          className="sidebar-overlay active" 
          onClick={toggleMobileMenu}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && toggleMobileMenu()}
          aria-label="Close menu"
        />
      )}
      
      <aside 
        className={`sidebar ${isMobileMenuOpen ? 'active' : ''}`}
        aria-hidden={!isMobileMenuOpen && isMobileView}
      >
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
          <button
            type="button"
            className={activeView === 'clients' ? 'active' : ''}
            onClick={() => setActiveView('clients')}
          >
            Client profiles
          </button>
          <button
            type="button"
            className={activeView === 'team' ? 'active' : ''}
            onClick={() => setActiveView('team')}
          >
            Team workload
          </button>
          <button
            type="button"
            className={activeView === 'settings' ? 'active' : ''}
            onClick={() => setActiveView('settings')}
          >
            Settings
          </button>
          <button
            type="button"
            className={activeView === 'payments' ? 'active' : ''}
            onClick={() => setActiveView('payments')}
          >
            Payment console
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

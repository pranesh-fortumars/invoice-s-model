import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import '../App.css'
import { CLIENT_DIRECTORY, ORGANIZATION, SERVICE_CATALOG } from '../data'
import type {
  ClientDetails,
  ClientProfile,
  InvoiceFormState,
  LineItem,
  Service,
} from '../types'

const currencyLocaleMap: Record<InvoiceFormState['currency'], string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
}

const emptyClientDetails: ClientDetails = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  gstin: '',
}

const toClientDetails = (profile: ClientProfile): ClientDetails => ({
  companyName: profile.companyName,
  contactName: profile.contactName,
  email: profile.email,
  phone: profile.phone,
  addressLine1: profile.addressLine1,
  addressLine2: profile.addressLine2 ?? '',
  city: profile.city,
  state: profile.state,
  postalCode: profile.postalCode,
  country: profile.country,
  gstin: profile.gstin ?? '',
})

const formatDateForInput = (date: Date) => date.toISOString().split('T')[0]

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const generateId = () => Math.random().toString(36).slice(2, 10)

const createLineItem = (service?: Service): LineItem => ({
  id: generateId(),
  serviceId: service?.id ?? '',
  description: service?.description ?? '',
  quantity: 1,
  unitPrice: service?.unitRate ?? 0,
  discountRate: 0,
  notes: '',
})

const createInitialState = (): InvoiceFormState => {
  const today = new Date()
  const defaultClient = CLIENT_DIRECTORY[0]
  return {
    clientSelectionId: defaultClient?.id ?? '',
    client: defaultClient ? toClientDetails(defaultClient) : { ...emptyClientDetails },
    currency: 'INR',
    taxRate: 18,
    lineItems: [createLineItem(SERVICE_CATALOG[0])],
    meta: {
      invoiceNumber: `ADS-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${generateId()}`,
      issueDate: formatDateForInput(today),
      dueDate: formatDateForInput(addDays(today, 15)),
      projectName: 'Retainer Services',
      purchaseOrder: '',
      reference: '',
    },
    terms:
      'Payment due within 15 days from the invoice date. Please remit via bank transfer to the account listed. Late payments accrue a 2% monthly finance charge.',
    additionalNote: '',
  }
}

const serviceLookup = SERVICE_CATALOG.reduce<Record<string, Service>>((acc, service) => {
  acc[service.id] = service
  return acc
}, {})

export const InvoiceBuilder = () => {
  const [formState, setFormState] = useState<InvoiceFormState>(() => createInitialState())
  const [layoutMode, setLayoutMode] = useState<'split' | 'form' | 'preview'>('form')
  const previewRef = useRef<HTMLDivElement>(null)
  const hasUserSelectedLayout = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setLayoutMode('split')
      return
    }

    const mediaQuery = window.matchMedia('(min-width: 1280px)')

    const applyLayout = (matches: boolean) => {
      if (hasUserSelectedLayout.current) {
        return
      }
      setLayoutMode(matches ? 'split' : 'form')
    }

    applyLayout(mediaQuery.matches)

    const listener = (event: MediaQueryListEvent) => {
      applyLayout(event.matches)
    }

    mediaQuery.addEventListener('change', listener)

    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currencyLocaleMap[formState.currency], {
        style: 'currency',
        currency: formState.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [formState.currency],
  )

  const totals = useMemo(() => {
    const subtotal = formState.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountTotal = formState.lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice * item.discountRate) / 100,
      0,
    )
    const taxableAmount = Math.max(subtotal - discountTotal, 0)
    const taxAmount = (taxableAmount * formState.taxRate) / 100
    const total = taxableAmount + taxAmount
    return {
      subtotal,
      discountTotal,
      taxableAmount,
      taxAmount,
      total,
    }
  }, [formState.lineItems, formState.taxRate])

  const handleClientSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = event.target.value
    const selectedProfile = CLIENT_DIRECTORY.find((client) => client.id === selectedId)
    setFormState((prev) => ({
      ...prev,
      clientSelectionId: selectedId,
      client: selectedProfile ? toClientDetails(selectedProfile) : { ...prev.client },
    }))
  }

  const handleClientDetailChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      client: {
        ...prev.client,
        [name]: value,
      },
    }))
  }

  const handleMetaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [name]: value,
      },
    }))
  }

  const handleCurrencyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    setFormState((prev) => ({
      ...prev,
      currency: value as InvoiceFormState['currency'],
    }))
  }

  const handleTaxRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value)
    setFormState((prev) => ({
      ...prev,
      taxRate: Number.isNaN(nextValue) ? prev.taxRate : Math.max(nextValue, 0),
    }))
  }

  const handleTermsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setFormState((prev) => ({
      ...prev,
      terms: event.target.value,
    }))
  }

  const handleAdditionalNoteChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setFormState((prev) => ({
      ...prev,
      additionalNote: event.target.value,
    }))
  }

  const handleLineItemFieldChange = <T extends keyof LineItem>(
    id: string,
    field: T,
    value: LineItem[T],
  ) => {
    setFormState((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const handleServiceChange = (id: string, serviceId: string) => {
    const service = serviceLookup[serviceId]
    setFormState((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === id
          ? {
              ...item,
              serviceId,
              description: service ? service.description : item.description,
              unitPrice: service ? service.unitRate : item.unitPrice,
            }
          : item,
      ),
    }))
  }

  const handleAddLineItem = () => {
    setFormState((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, createLineItem()],
    }))
  }

  const handleRemoveLineItem = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      lineItems: prev.lineItems.length > 1 ? prev.lineItems.filter((item) => item.id !== id) : prev.lineItems,
    }))
  }

  const handleGenerateInvoice = () => {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePrintInvoice = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const handleLayoutModeChange = (mode: 'split' | 'form' | 'preview') => {
    hasUserSelectedLayout.current = true
    setLayoutMode(mode)
    if (mode === 'preview') {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const workspaceClassName = `workspace layout-${layoutMode}`
  const formPanelClassName = `form-panel${layoutMode === 'preview' ? ' is-hidden' : ''}`
  const previewPanelClassName = `preview-panel${layoutMode === 'form' ? ' is-hidden' : ''}`

  return (
    <div className="invoice-builder">
      <header className="page-header">
        <div>
          <p className="organization-tagline">{ORGANIZATION.tagline}</p>
          <h1>{ORGANIZATION.displayName}</h1>
        </div>
        <div className="org-contact-block">
          <p>{ORGANIZATION.address.line1}</p>
          <p>
            {ORGANIZATION.address.line2}
            {ORGANIZATION.address.line2 ? ', ' : ''}
            {ORGANIZATION.address.city}, {ORGANIZATION.address.state} {ORGANIZATION.address.postalCode}
          </p>
          <p>{ORGANIZATION.address.country}</p>
          <p>{ORGANIZATION.taxRegistration}</p>
          <p>
            {ORGANIZATION.contact.phone} • {ORGANIZATION.contact.email}
          </p>
          <p>{ORGANIZATION.contact.website}</p>
        </div>
      </header>

      <div className="action-toolbar">
        <button type="button" className="primary" onClick={handleGenerateInvoice}>
          Generate Invoice Preview
        </button>
        <button type="button" className="outline" onClick={handlePrintInvoice}>
          Print Invoice
        </button>
        <div className="layout-toggle" role="group" aria-label="Invoice layout mode">
          <button
            type="button"
            className={layoutMode === 'form' ? 'active' : ''}
            onClick={() => handleLayoutModeChange('form')}
          >
            Form only
          </button>
          <button
            type="button"
            className={layoutMode === 'split' ? 'active' : ''}
            onClick={() => handleLayoutModeChange('split')}
          >
            Split view
          </button>
          <button
            type="button"
            className={layoutMode === 'preview' ? 'active' : ''}
            onClick={() => handleLayoutModeChange('preview')}
          >
            Preview only
          </button>
        </div>
      </div>

      <main className={workspaceClassName}>
        <section className={formPanelClassName}>
          <h2>Invoice Builder</h2>

          <div className="form-section">
            <div className="section-heading">
              <h3>Client Information</h3>
              <span className="section-hint">Select an existing client or customise details.</span>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Client profile</span>
                <select value={formState.clientSelectionId} onChange={handleClientSelectChange}>
                  <option value="">Custom client</option>
                  {CLIENT_DIRECTORY.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Company name</span>
                <input
                  name="companyName"
                  value={formState.client.companyName}
                  onChange={handleClientDetailChange}
                  placeholder="Enter client company"
                />
              </label>
              <label className="field">
                <span>Primary contact</span>
                <input
                  name="contactName"
                  value={formState.client.contactName}
                  onChange={handleClientDetailChange}
                  placeholder="Requester name"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={formState.client.email}
                  onChange={handleClientDetailChange}
                  placeholder="billing@email.com"
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  name="phone"
                  value={formState.client.phone}
                  onChange={handleClientDetailChange}
                  placeholder="+91"
                />
              </label>
              <label className="field">
                <span>GSTIN / Tax ID</span>
                <input
                  name="gstin"
                  value={formState.client.gstin ?? ''}
                  onChange={handleClientDetailChange}
                  placeholder="Tax registration"
                />
              </label>
              <label className="field field-wide">
                <span>Address line 1</span>
                <input
                  name="addressLine1"
                  value={formState.client.addressLine1}
                  onChange={handleClientDetailChange}
                  placeholder="Street address"
                />
              </label>
              <label className="field field-wide">
                <span>Address line 2</span>
                <input
                  name="addressLine2"
                  value={formState.client.addressLine2 ?? ''}
                  onChange={handleClientDetailChange}
                  placeholder="Suite, floor, etc."
                />
              </label>
              <label className="field">
                <span>City</span>
                <input
                  name="city"
                  value={formState.client.city}
                  onChange={handleClientDetailChange}
                  placeholder="City"
                />
              </label>
              <label className="field">
                <span>State</span>
                <input
                  name="state"
                  value={formState.client.state}
                  onChange={handleClientDetailChange}
                  placeholder="State"
                />
              </label>
              <label className="field">
                <span>Postal code</span>
                <input
                  name="postalCode"
                  value={formState.client.postalCode}
                  onChange={handleClientDetailChange}
                  placeholder="Postal code"
                />
              </label>
              <label className="field">
                <span>Country</span>
                <input
                  name="country"
                  value={formState.client.country}
                  onChange={handleClientDetailChange}
                  placeholder="Country"
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="section-heading">
              <h3>Invoice Details</h3>
              <span className="section-hint">Standardised identifiers for finance reconciliation.</span>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Invoice number</span>
                <input
                  name="invoiceNumber"
                  value={formState.meta.invoiceNumber}
                  onChange={handleMetaChange}
                />
              </label>
              <label className="field">
                <span>Issue date</span>
                <input
                  type="date"
                  name="issueDate"
                  value={formState.meta.issueDate}
                  onChange={handleMetaChange}
                />
              </label>
              <label className="field">
                <span>Due date</span>
                <input type="date" name="dueDate" value={formState.meta.dueDate} onChange={handleMetaChange} />
              </label>
              <label className="field">
                <span>Project / engagement</span>
                <input
                  name="projectName"
                  value={formState.meta.projectName}
                  onChange={handleMetaChange}
                  placeholder="e.g. Digital Growth Retainer"
                />
              </label>
              <label className="field">
                <span>Purchase order</span>
                <input
                  name="purchaseOrder"
                  value={formState.meta.purchaseOrder}
                  onChange={handleMetaChange}
                  placeholder="Optional reference"
                />
              </label>
              <label className="field">
                <span>Internal reference</span>
                <input
                  name="reference"
                  value={formState.meta.reference}
                  onChange={handleMetaChange}
                  placeholder="Account manager, etc."
                />
              </label>
              <label className="field">
                <span>Currency</span>
                <select value={formState.currency} onChange={handleCurrencyChange}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
              <label className="field">
                <span>Tax rate (%)</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={formState.taxRate}
                  onChange={handleTaxRateChange}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="section-heading">
              <h3>Line Items</h3>
              <span className="section-hint">Select billable services and tailor descriptions per engagement.</span>
            </div>
            <div className="line-items-table">
              <div className="line-items-track">
                <div className="table-head">
                  <span>Service</span>
                  <span>Description</span>
                  <span>Unit price</span>
                  <span>Quantity</span>
                  <span>Discount %</span>
                  <span>Amount</span>
                  <span></span>
                </div>
                {formState.lineItems.map((item) => {
                  const service = item.serviceId ? serviceLookup[item.serviceId] : undefined
                  const lineBase = item.quantity * item.unitPrice
                  const lineDiscount = (lineBase * item.discountRate) / 100
                  const lineTotal = lineBase - lineDiscount
                  return (
                    <div className="table-row" key={item.id}>
                      <div className="cell">
                        <select value={item.serviceId} onChange={(event) => handleServiceChange(item.id, event.target.value)}>
                          <option value="">Select service</option>
                          {SERVICE_CATALOG.map((svc) => (
                            <option key={svc.id} value={svc.id}>
                              {svc.name}
                            </option>
                          ))}
                        </select>
                        {service ? <small className="cell-sub">{service.unit}</small> : null}
                      </div>
                      <div className="cell">
                        <textarea
                          value={item.description}
                          onChange={(event) => handleLineItemFieldChange(item.id, 'description', event.target.value)}
                          rows={3}
                        />
                        <textarea
                          className="note"
                          placeholder="Internal notes or deliverable highlights (optional)"
                          value={item.notes ?? ''}
                          onChange={(event) => handleLineItemFieldChange(item.id, 'notes', event.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="cell">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(event) =>
                            handleLineItemFieldChange(item.id, 'unitPrice', Number(event.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="cell">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={item.quantity}
                          onChange={(event) =>
                            handleLineItemFieldChange(item.id, 'quantity', Number(event.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="cell">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={item.discountRate}
                          onChange={(event) =>
                            handleLineItemFieldChange(item.id, 'discountRate', Number(event.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="cell monetary">{currencyFormatter.format(lineTotal || 0)}</div>
                      <div className="cell actions">
                        <button type="button" className="ghost" onClick={() => handleRemoveLineItem(item.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="line-item-actions">
              <button type="button" className="outline" onClick={handleAddLineItem}>
                Add line item
              </button>
            </div>
          </div>

          <div className="form-section">
            <div className="section-heading">
              <h3>Terms &amp; Notes</h3>
              <span className="section-hint">Set payment expectations and contextual remarks.</span>
            </div>
            <div className="field-grid single">
              <label className="field field-wide">
                <span>Payment terms</span>
                <textarea value={formState.terms} rows={4} onChange={handleTermsChange} />
              </label>
              <label className="field field-wide">
                <span>Additional note</span>
                <textarea
                  value={formState.additionalNote}
                  rows={3}
                  placeholder="Thank you message, delivery summary, or contextual briefing."
                  onChange={handleAdditionalNoteChange}
                />
              </label>
            </div>
          </div>
        </section>

        <section className={previewPanelClassName} ref={previewRef}>
          <div className="preview-header">
            <div>
              <h2>Invoice</h2>
              <p className="invoice-number">{formState.meta.invoiceNumber}</p>
            </div>
            <div className="preview-meta">
              <p>
                <span>Issued:</span> {formState.meta.issueDate}
              </p>
              <p>
                <span>Due:</span> {formState.meta.dueDate}
              </p>
              {formState.meta.purchaseOrder ? (
                <p>
                  <span>PO:</span> {formState.meta.purchaseOrder}
                </p>
              ) : null}
              {formState.meta.reference ? (
                <p>
                  <span>Ref:</span> {formState.meta.reference}
                </p>
              ) : null}
            </div>
          </div>

          <div className="preview-entities">
            <div>
              <h4>From</h4>
              <p>{ORGANIZATION.legalName}</p>
              <p>{ORGANIZATION.address.line1}</p>
              <p>
                {ORGANIZATION.address.line2}
                {ORGANIZATION.address.line2 ? ', ' : ''}
                {ORGANIZATION.address.city}, {ORGANIZATION.address.state} {ORGANIZATION.address.postalCode}
              </p>
              <p>{ORGANIZATION.address.country}</p>
              <p>{ORGANIZATION.taxRegistration}</p>
              <p>{ORGANIZATION.contact.email}</p>
              <p>{ORGANIZATION.contact.phone}</p>
            </div>
            <div>
              <h4>Bill to</h4>
              <p>{formState.client.companyName || '—'}</p>
              {formState.client.contactName ? <p>Attn: {formState.client.contactName}</p> : null}
              {formState.client.addressLine1 ? <p>{formState.client.addressLine1}</p> : null}
              {formState.client.addressLine2 ? <p>{formState.client.addressLine2}</p> : null}
              <p>
                {[formState.client.city, formState.client.state].filter(Boolean).join(', ')}{' '}
                {formState.client.postalCode}
              </p>
              <p>{formState.client.country}</p>
              {formState.client.gstin ? <p>Tax ID: {formState.client.gstin}</p> : null}
              {formState.client.email ? <p>{formState.client.email}</p> : null}
              {formState.client.phone ? <p>{formState.client.phone}</p> : null}
            </div>
            <div>
              <h4>Engagement</h4>
              <p>{formState.meta.projectName || '—'}</p>
              {formState.additionalNote ? (
                <p className="highlight-note">{formState.additionalNote}</p>
              ) : null}
            </div>
          </div>

          <div className="preview-table">
            <div className="preview-table-head">
              <span>Service</span>
              <span>Description</span>
              <span>Qty</span>
              <span>Unit price</span>
              <span>Discount</span>
              <span>Amount</span>
            </div>
            {formState.lineItems.map((item) => {
              const service = item.serviceId ? serviceLookup[item.serviceId] : undefined
              const lineBase = item.quantity * item.unitPrice
              const lineDiscount = (lineBase * item.discountRate) / 100
              const lineTotal = lineBase - lineDiscount
              return (
                <div className="preview-table-row" key={item.id}>
                  <span>
                    {service ? service.name : 'Custom service'}
                    {service ? <em>{service.category}</em> : null}
                  </span>
                  <span>
                    {item.description || '—'}
                    {item.notes ? <small>{item.notes}</small> : null}
                  </span>
                  <span>{item.quantity}</span>
                  <span>{currencyFormatter.format(item.unitPrice)}</span>
                  <span>{item.discountRate ? `${item.discountRate}%` : '—'}</span>
                  <span>{currencyFormatter.format(lineTotal)}</span>
                </div>
              )
            })}
          </div>

          <div className="totals-panel">
            <div>
              <span>Subtotal</span>
              <span>{currencyFormatter.format(totals.subtotal)}</span>
            </div>
            <div>
              <span>Discounts</span>
              <span>{currencyFormatter.format(totals.discountTotal)}</span>
            </div>
            <div>
              <span>Taxable amount</span>
              <span>{currencyFormatter.format(totals.taxableAmount)}</span>
            </div>
            <div>
              <span>Tax @ {formState.taxRate.toFixed(2)}%</span>
              <span>{currencyFormatter.format(totals.taxAmount)}</span>
            </div>
            <div className="grand-total">
              <span>Total due</span>
              <span>{currencyFormatter.format(totals.total)}</span>
            </div>
          </div>

          <div className="terms-block">
            <h4>Payment Instructions</h4>
            <p>{formState.terms}</p>
            <div className="banking">
              <p>
                Beneficiary: <strong>{ORGANIZATION.bank.beneficiary}</strong>
              </p>
              <p>
                Bank: {ORGANIZATION.bank.bankName} • A/C No: {ORGANIZATION.bank.accountNumber}
              </p>
              <p>
                IFSC: {ORGANIZATION.bank.ifsc} • SWIFT: {ORGANIZATION.bank.swift}
              </p>
            </div>
            <p className="footer-note">Thank you for partnering with {ORGANIZATION.displayName}.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

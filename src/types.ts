export type ServiceCategory = 'Digital Marketing' | 'Web Development' | 'Software Development'

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  description: string
  unit: string
  unitRate: number
}

export interface ClientProfile {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  gstin?: string
}

export interface ClientDetails extends Omit<ClientProfile, 'id'> {}

export interface LineItem {
  id: string
  serviceId: string
  description: string
  quantity: number
  unitPrice: number
  discountRate: number
  notes?: string
}

export interface InvoiceMeta {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  projectName: string
  purchaseOrder?: string
  reference?: string
}

export interface InvoiceFormState {
  clientSelectionId: string
  client: ClientDetails
  currency: 'INR' | 'USD' | 'EUR'
  taxRate: number
  lineItems: LineItem[]
  meta: InvoiceMeta
  terms: string
  additionalNote: string
}

export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue'

export interface InvoiceRecord {
  id: string
  invoiceNumber: string
  clientId: string
  engagement: string
  currency: InvoiceFormState['currency']
  amount: number
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  lastUpdated: string
}

export interface ActivityLog {
  id: string
  timestamp: string
  summary: string
  actor: string
  activityType: 'invoice' | 'payment' | 'reminder' | 'note'
  relatedInvoiceId?: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  email: string
  avatarColor: string
  initials: string
}

export type PaymentGatewayStatus = 'Active' | 'Maintenance' | 'Disconnected'

export type PaymentChannelStatus = 'Enabled' | 'Disabled' | 'Degraded'

export type PaymentMethod = 'UPI' | 'Credit Card' | 'NetBanking' | 'Wire Transfer'

export interface PaymentGatewayChannel {
  id: string
  label: string
  method: PaymentMethod
  status: PaymentChannelStatus
  successRate: number
  slaMinutes: number
}

export interface PaymentGatewayConfig {
  id: string
  providerName: string
  status: PaymentGatewayStatus
  reconciliationStatus: 'On schedule' | 'Delayed'
  settlementWindow: string
  feePercentage: number
  lastSync: string
  credentials: {
    merchantId: string
    keyEnding: string
    webhookUrl: string
  }
  channels: PaymentGatewayChannel[]
}

export type PaymentTransactionStatus = 'Succeeded' | 'Pending' | 'Failed'

export interface PaymentTransaction {
  id: string
  invoiceId: string
  clientId: string
  amount: number
  currency: InvoiceFormState['currency']
  method: PaymentMethod
  status: PaymentTransactionStatus
  receivedAt: string
  feeAmount: number
  netAmount: number
  reference: string
}

export interface ServiceShowcase {
  id: string
  headline: string
  summary: string
  deliverables: string[]
  persona: string
  projectedTimeline: string
}

import { AbstractPaymentProvider, PaymentSessionStatus, PaymentActions } from '@medusajs/framework/utils'

class ManualPaymentProvider extends AbstractPaymentProvider {
  static identifier = 'manual_manual'

  constructor(container: any, options: any) {
    super(container, options)
  }

  async initiatePayment(input: any) {
    // For manual payments, we just create a session without actual payment processing
    return {
      data: {
        session_id: `manual_${Date.now()}`,
        status: 'pending'
      },
      id: `manual_${Date.now()}`
    }
  }

  async authorizePayment(input: any) {
    // Manual payment requires manual authorization
    return {
      data: {
        session_id: input.data?.session_id || input.id,
        status: 'authorized'
      },
      status: PaymentSessionStatus.AUTHORIZED
    }
  }

  async capturePayment(input: any) {
    // Manual payment capture (when payment is actually received)
    return {
      data: {
        session_id: input.data?.session_id || input.id,
        status: 'captured'
      }
    }
  }

  async cancelPayment(input: any) {
    return {
      data: {
        session_id: input.data?.session_id || input.id,
        status: 'cancelled'
      }
    }
  }

  async deletePayment(input: any) {
    return {
      data: {}
    }
  }

  async getPaymentStatus(input: any) {
    // For manual payments, status needs to be manually updated
    return {
      status: PaymentSessionStatus.PENDING
    }
  }

  async refundPayment(input: any) {
    return {
      data: {
        refund_id: `refund_${Date.now()}`,
        status: 'refunded'
      }
    }
  }

  async retrievePayment(input: any) {
    return {
      data: input.data || {}
    }
  }

  async updatePayment(input: any) {
    return {
      data: {
        ...input.data,
        updated_at: new Date().toISOString()
      }
    }
  }

  async getWebhookActionAndData(data: any) {
    return {
      action: PaymentActions.NOT_SUPPORTED
    }
  }

  async getPaymentData(session: any) {
    return session.data || {}
  }

  async getStatus(session: any) {
    return session.data?.status || 'pending'
  }

  async createAccountHolder(input: any) {
    return { id: input.context?.customer?.id || 'manual_account' }
  }

  async deleteAccountHolder(input: any) {
    return { data: {} }
  }
}

export default ManualPaymentProvider
import * as bsv from 'bsv'
import ApiService from './api'
import StateService from './state'
import type { IStateServiceGetResponse } from './state'
import { AnypayApiResponse } from 'types/api'

/**
 * Anypay payment service
 */
export type IAnypayService = {
  config: {
    invoiceId: string
    onLoadCallbackForRelayX?: (payload: IAnypayServiceOnLoadCallbackForRelayX) => IAnypayServiceOnLoadCallbackForRelayXResponse
    onErrorCallbackForRelayX?: (payload: IAnypayServiceOnErrorCallbackForRelayX) => IAnypayServiceOnErrorCallbackForRelayXResponse
    onPaymentCallbackForRelayX?: (payload: IAnypayServiceOnPaymentCallbackForRelayX) => IAnypayServiceOnPaymentCallbackForRelayXResponse

    onLoadCallbackForMoneybutton?: (payload: IAnypayServiceOnLoadCallbackForMoneybutton) => IAnypayServiceOnLoadCallbackForMoneybuttonResponse
    onErrorCallbackForMoneybutton?: (payload: IAnypayServiceOnErrorCallbackForMoneybutton) => IAnypayServiceOnErrorCallbackForMoneybuttonResponse
    onPaymentCallbackForMoneybutton?: (payload: IAnypayServiceOnPaymentCallbackForMoneybutton) => IAnypayServiceOnPaymentCallbackForMoneybuttonResponse
  }
}

export type IAnypayServiceResponse = {
  init: () => void
  fail: (state: IAnypayServiceFail) => void
  pollInvoice: () => NodeJS.Timer
  getPaymentInputForRelayX: () => IAnypayServiceGetPaymentInputForRelayXResponse
  getPaymentOutputForRelayX: () => IAnypayServiceGetPaymentOutputForRelayXResponse
  getPaymentInputForMoneybutton: () => IAnypayServiceGetPaymentInputForMoneybuttonResponse
  getPaymentOutputForMoneybutton: () => IAnypayServiceGetPaymentOutputForMoneybuttonResponse
  state: IStateServiceGetResponse

  onLoadCallbackForRelayX: (payload: IAnypayServiceOnLoadCallbackForRelayX) => IAnypayServiceOnLoadCallbackForRelayXResponse
  onErrorCallbackForRelayX: (payload: IAnypayServiceOnErrorCallbackForRelayX) => IAnypayServiceOnErrorCallbackForRelayXResponse
  onPaymentCallbackForRelayX: (payload: IAnypayServiceOnPaymentCallbackForRelayX) => IAnypayServiceOnPaymentCallbackForRelayXResponse

  onLoadCallbackForMoneybutton: (payload: IAnypayServiceOnLoadCallbackForMoneybutton) => IAnypayServiceOnLoadCallbackForMoneybuttonResponse
  onErrorCallbackForMoneybutton: (payload: IAnypayServiceOnErrorCallbackForMoneybutton) => IAnypayServiceOnErrorCallbackForMoneybuttonResponse
  onPaymentCallbackForMoneybutton: (payload: IAnypayServiceOnPaymentCallbackForMoneybutton) => IAnypayServiceOnPaymentCallbackForMoneybuttonResponse

  publishBroadcastedTransaction: (payload: any) => Promise<void>
  getAmountFromSatoshis: (state: number) => number
  getCurrencyFromNetwork: (state: string) => string
}

export type IAnypayServiceFail = {
  error: string
}

export type IAnypayServiceGetPaymentInputForRelayXResponse = {
  outputs: {
    to: string
    amount: number
    currency: string
  }[]
}

export type IAnypayServiceGetPaymentOutputForRelayXResponse = {
  transaction: string
}

export type IAnypayServiceGetPaymentInputForMoneybuttonResponse = {
  outputs: {
    to: string
    amount: number
    currency: string
  }[]
}

export type IAnypayServiceGetPaymentOutputForMoneybuttonResponse = {
  transaction: string
}

export type IAnypayServiceOnLoadCallbackForRelayX = any
export type IAnypayServiceOnLoadCallbackForRelayXResponse = void

export type IAnypayServiceOnPaymentCallbackForRelayX = any
export type IAnypayServiceOnPaymentCallbackForRelayXResponse = void

export type IAnypayServiceOnErrorCallbackForRelayX = any
export type IAnypayServiceOnErrorCallbackForRelayXResponse = void

export type IAnypayServiceOnLoadCallbackForMoneybutton = any
export type IAnypayServiceOnLoadCallbackForMoneybuttonResponse = void

export type IAnypayServiceOnPaymentCallbackForMoneybutton = any
export type IAnypayServiceOnPaymentCallbackForMoneybuttonResponse = void

export type IAnypayServiceOnErrorCallbackForMoneybutton = any
export type IAnypayServiceOnErrorCallbackForMoneybuttonResponse = void

const AnypayService = ({ config } : IAnypayService) : IAnypayServiceResponse => {
  const state = StateService()
  const api = ApiService()

  const pollInvoice = () => {
    if (!state.state.invoiceId) {
      throw new Error('Invoice could not be polled as it wasn\'t initialized')
    }

    const callback = (invoice: AnypayApiResponse.InvoiceGetResponse) => {
      if (invoice.status === 'paid') {
        state.set({
          status: 'broadcasted',
          invoice,
        })
        clearInterval(interval)
      }
    }

    const interval = api.invoiceGetPoll({ invoiceId: state.state.invoiceId, callback })
    return interval
  }

  /**
   * Currency abbreviation based on network
   */
  const getCurrencyFromNetwork = (currency: string) => {
    if (currency === 'bitcoin-sv') {
      return 'BSV'
    }

    throw new Error('Uknown currency provided')
  }

  const getAmountFromSatoshis = (amount: number) => {
    return amount / 100000000
  }

  const init = async () : Promise<void> => {
    try {
      const invoice = await api.invoiceGet({ invoiceId: config.invoiceId })
      const invoiceReport = await api.invoiceReportGet({ invoiceId: config.invoiceId })

      state.set({
        initialized: true,
        status: 'pending',
        invoiceId: config.invoiceId,
        invoiceReport,
        invoice,
      })
    } catch (error) {
      fail({ error: error as string })
    }
  }

  const fail = ({ error } : IAnypayServiceFail) : void => {
    state.set({
      initialized: true,
      status: 'failure',
    })
  }

  const getPaymentInputForRelayX = () : IAnypayServiceGetPaymentInputForRelayXResponse => {
    const networkMapper = (output: { script: string, amount: number }) => ({
      ...output, network: state.state.invoiceReport?.network || '',
    })

    const outputsMapper = (output: { script: string, amount: number, network: string }) => {
      const script = new bsv.Script(output.script)

      return {
        to: script.toASM(),
        amount: getAmountFromSatoshis(output.amount),
        currency: getCurrencyFromNetwork(output.network),
      }
    }

    const outputs = state.state.invoiceReport?.outputs.map(networkMapper).map(outputsMapper) || []

    return {
      outputs,
    }
  }

  const getPaymentOutputForRelayX = () : IAnypayServiceGetPaymentOutputForRelayXResponse => {
    if (state.state.processed?.provider !== 'relayx') {
      throw new Error('Incompatible network provider, only relayx is supported')
    }

    return {
      transaction: state.state.processed.payload.rawTx
    }
  }

  const getPaymentInputForMoneybutton = () : IAnypayServiceGetPaymentInputForMoneybuttonResponse => {
    const networkMapper = (output: { script: string, amount: number }) => ({
      ...output, network: state.state.invoiceReport?.network || '',
    })

    const outputsMapper = (output: { script: string, amount: number, network: string }) => {
      const script = new bsv.Script(output.script)

      return {
        to: script.toASM(),
        amount: getAmountFromSatoshis(output.amount),
        currency: getCurrencyFromNetwork(output.network),
      }
    }

    const outputs = state.state.invoiceReport?.outputs.map(networkMapper).map(outputsMapper) || []

    return {
      outputs,
    }
  }

  const getPaymentOutputForMoneybutton = () : IAnypayServiceGetPaymentOutputForMoneybuttonResponse => {
    if (state.state.processed?.provider !== 'moneybutton') {
      throw new Error('Incompatible network provider, only moneybutton is supported')
    }

    return {
      transaction: state.state.processed.payload.rawtx
    }
  }

  const onLoadCallbackForRelayX = (payload: IAnypayServiceOnLoadCallbackForRelayX) : IAnypayServiceOnLoadCallbackForRelayXResponse => {
    config.onLoadCallbackForRelayX && config.onLoadCallbackForRelayX(payload)
  }

  const onErrorCallbackForRelayX = (payload: IAnypayServiceOnErrorCallbackForRelayX) : IAnypayServiceOnErrorCallbackForRelayXResponse => {
    config.onErrorCallbackForRelayX && config.onErrorCallbackForRelayX(payload)
  }

  const onPaymentCallbackForRelayX = (payload: IAnypayServiceOnPaymentCallbackForRelayX) : IAnypayServiceOnPaymentCallbackForRelayXResponse => {
    config.onPaymentCallbackForRelayX && config.onPaymentCallbackForRelayX(payload)
    state.set({
      status: 'broadcasted',
      processed: {
        provider: 'relayx',
        payload,
      },
    })
  }

  const onLoadCallbackForMoneybutton = (payload: IAnypayServiceOnLoadCallbackForMoneybutton) : IAnypayServiceOnLoadCallbackForMoneybuttonResponse => {
    config.onLoadCallbackForMoneybutton && config.onLoadCallbackForMoneybutton(payload)
  }

  const onErrorCallbackForMoneybutton = (payload: IAnypayServiceOnErrorCallbackForMoneybutton) : IAnypayServiceOnErrorCallbackForMoneybuttonResponse => {
    config.onErrorCallbackForMoneybutton && config.onErrorCallbackForMoneybutton(payload)
  }

  const onPaymentCallbackForMoneybutton = (payload: IAnypayServiceOnPaymentCallbackForMoneybutton) : IAnypayServiceOnPaymentCallbackForMoneybuttonResponse => {
    config.onPaymentCallbackForMoneybutton && config.onPaymentCallbackForMoneybutton(payload)
    state.set({
      status: 'broadcasted',
      processed: {
        provider: 'moneybutton',
        payload,
      },
    })
  }

  const publishBroadcastedTransaction = async (payload: any) => {
    if (!state.state.invoiceId) {
      throw new Error('Transaction could not be broadcasted as it wasn\'t initialized')
    }

    api.invoiceReportPost({ invoiceId: state.state.invoiceId }, payload)

    state.set({
      status: 'broadcasted',
    })
  }

  return ({
    state: state.state,
    init,
    fail,
    pollInvoice,
    
    getPaymentInputForRelayX,
    getPaymentOutputForRelayX,
    getPaymentOutputForMoneybutton,
    getPaymentInputForMoneybutton,
    publishBroadcastedTransaction,
    getAmountFromSatoshis,
    getCurrencyFromNetwork,

    onLoadCallbackForRelayX,
    onErrorCallbackForRelayX,
    onPaymentCallbackForRelayX,
    onLoadCallbackForMoneybutton,
    onErrorCallbackForMoneybutton,
    onPaymentCallbackForMoneybutton,
  })
}

export default AnypayService

import { Meta } from '@storybook/react'

import PaymentsOptionsItemHeaderComponent from './PaymentsOptionsItemHeader'

export default {
  component: PaymentsOptionsItemHeaderComponent,
  title: 'Components/PaymentsOptionsItemHeader',
} as Meta

export const Default = () => (
  <PaymentsOptionsItemHeaderComponent
    title="Payment option"
    subtitle="Payment option description, could be long as well"
  />
)

export const WithIcon = () => (
  <PaymentsOptionsItemHeaderComponent
    title="Payment option"
    subtitle="Payment option description, could be long as well"
  />
)

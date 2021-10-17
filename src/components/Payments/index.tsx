import React, { useEffect } from 'react'
import PaymentsHeaderComponent from 'components/Payments/PaymentsHeader'
import PaymentsOptionsComponent from 'components/Payments/PaymentsOptions'
import PaymentsSummaryComponent from 'components/Payments/PaymentsSummary'
import styled from 'styled-components'
import CartService from 'services/Cart'
import { generateMedia } from 'styled-media-query'

const media = generateMedia({
  medium: '40rem',
})

const WrapperStyled = styled.div`
`

const ComponentStyled = styled.div`
`

const HeaderStyled = styled.div`
  ${props => props.theme.padding.defaultBottom}
  ${media.greaterThan('medium')`
    padding-bottom: 3rem;
  `}
`

const MainStyled = styled.div`
  ${media.greaterThan('medium')`
    ${props => props.theme.flex.directionRow}
  `}
`

const ContentStyled = styled.div`
  ${media.greaterThan('medium')`
    width: 60%;
    ${props => props.theme.padding.smallRight}
  `}
`

const SidebarStyled = styled.div`
  ${media.greaterThan('medium')`
    width: 40%;
    ${props => props.theme.padding.smallLeft}
  `}
`

function PaymentsComponent() {
  const cart = CartService()

  const products = [
    { id: '1', name: 'Ancient Vase', description: 'Ancient vase from ancient times', price: 19.00 },
    { id: '2', name: 'Ancient Clock', description: 'Ancient clock from ancient times', price: 47.00 },
  ]

  useEffect(() => {
    if (!cart.get().initialized) {
      cart.initialize(products)
    }
  }, [])

  return (
    <WrapperStyled>
      <ComponentStyled>
        <HeaderStyled>
          <PaymentsHeaderComponent />
        </HeaderStyled>

        <MainStyled>
          <ContentStyled>
            <PaymentsOptionsComponent />
          </ContentStyled>

          <SidebarStyled>
            <PaymentsSummaryComponent />
          </SidebarStyled>
        </MainStyled>
      </ComponentStyled>
    </WrapperStyled>
  )
}

export default PaymentsComponent

import React, { createContext, useContext } from 'react'

const BrandingContext = createContext<any>({})

export const BrandingProvider = ({ children }: { children: React.ReactNode }) => (
  <BrandingContext.Provider value={{}}>{children}</BrandingContext.Provider>
)

export const useBrandingContext = () => useContext(BrandingContext)
export const useBranding = () => ({ logo: null, primaryColor: '#000' })

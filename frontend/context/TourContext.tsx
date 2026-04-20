'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface TourContextType {
    isActive: boolean;
    currentStep: number;
    startTour: () => void;
    stopTour: () => void;
    nextStep: () => void;
    setCurrentStep: (step: number) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const startTour = useCallback(() => {
        setCurrentStep(0);
        setIsActive(true);
    }, []);

    const stopTour = useCallback(() => {
        setIsActive(false);
    }, []);

    const nextStep = useCallback(() => {
        setCurrentStep(prev => prev + 1);
    }, []);

    return (
        <TourContext.Provider value={{ 
            isActive, 
            currentStep, 
            startTour, 
            stopTour, 
            nextStep, 
            setCurrentStep 
        }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}

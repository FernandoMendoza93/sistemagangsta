import { render, screen, fireEvent } from '@testing-library/react';
import ServiciosPage from '../pages/ServiciosPage';
import { describe, it, expect, vi } from 'vitest';

// Mock del servicio API
vi.mock('../services/api', () => ({
    serviciosService: {
        getAll: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn(),
        update: vi.fn(),
    }
}));

describe('ServiciosPage', () => {
    it('debe mostrar el botón de Nuevo Servicio', async () => {
        render(<ServiciosPage />);
        // Esperar a que termine el loading
        const button = await screen.findByText('+ Nuevo Servicio');
        expect(button).toBeInTheDocument();
    });

    it('debe abrir el modal al hacer click en Nuevo Servicio', async () => {
        render(<ServiciosPage />);
        const button = await screen.findByText('+ Nuevo Servicio');

        fireEvent.click(button);

        // Verificar que el modal se abre buscando el título
        const modalTitle = await screen.findByText('Nuevo Servicio');
        expect(modalTitle).toBeInTheDocument();

        // Verificar que el overlay tiene la clase correcta
        // Nota: Como usamos createPortal, el modal puede estar en el body.
        // Buscamos por clase
        const modalOverlay = document.querySelector('.custom-modal-overlay');
        expect(modalOverlay).toBeInTheDocument();
    });
});

/**
 * NetworkService Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkService } from '../../../src/services/network';

describe('NetworkService', () => {
	let networkService: NetworkService;
	let originalNavigator: typeof navigator;

	beforeEach(() => {
		originalNavigator = globalThis.navigator;
		networkService = new NetworkService();
	});

	afterEach(() => {
		networkService.destroy();
		Object.defineProperty(globalThis, 'navigator', {
			value: originalNavigator,
			writable: true,
		});
	});

	describe('isOnline', () => {
		it('should return true when navigator.onLine is true', () => {
			Object.defineProperty(globalThis, 'navigator', {
				value: { onLine: true },
				writable: true,
			});

			const service = new NetworkService();
			expect(service.isOnline()).toBe(true);
			service.destroy();
		});

		it('should return false when navigator.onLine is false', () => {
			Object.defineProperty(globalThis, 'navigator', {
				value: { onLine: false },
				writable: true,
			});

			const service = new NetworkService();
			expect(service.isOnline()).toBe(false);
			service.destroy();
		});
	});

	describe('getStatus', () => {
		it('should return "online" when navigator.onLine is true', () => {
			Object.defineProperty(globalThis, 'navigator', {
				value: { onLine: true },
				writable: true,
			});

			const service = new NetworkService();
			expect(service.getStatus()).toBe('online');
			service.destroy();
		});

		it('should return "offline" when navigator.onLine is false', () => {
			Object.defineProperty(globalThis, 'navigator', {
				value: { onLine: false },
				writable: true,
			});

			const service = new NetworkService();
			expect(service.getStatus()).toBe('offline');
			service.destroy();
		});
	});

	describe('onStatusChange', () => {
		it('should call callback when online event is fired', () => {
			const callback = vi.fn();
			networkService.onStatusChange(callback);

			// Simulate online event
			window.dispatchEvent(new Event('online'));

			expect(callback).toHaveBeenCalledWith('online');
		});

		it('should call callback when offline event is fired', () => {
			const callback = vi.fn();
			networkService.onStatusChange(callback);

			// Simulate offline event
			window.dispatchEvent(new Event('offline'));

			expect(callback).toHaveBeenCalledWith('offline');
		});

		it('should return unsubscribe function', () => {
			const callback = vi.fn();
			const unsubscribe = networkService.onStatusChange(callback);

			unsubscribe();

			// Simulate events after unsubscribe
			window.dispatchEvent(new Event('online'));
			window.dispatchEvent(new Event('offline'));

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('destroy', () => {
		it('should remove all event listeners', () => {
			const callback = vi.fn();
			networkService.onStatusChange(callback);
			networkService.destroy();

			// Simulate events after destroy
			window.dispatchEvent(new Event('online'));
			window.dispatchEvent(new Event('offline'));

			expect(callback).not.toHaveBeenCalled();
		});
	});
});

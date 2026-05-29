import { mount } from 'svelte';
import Root from './Root.svelte';
import { startWavedash } from '$extensions/wavedash/wavedash.svelte';

// Initialize the Wavedash host SDK as early as possible (no-op outside the host).
startWavedash();

mount(Root, {
	target: document.getElementById('app')!
});

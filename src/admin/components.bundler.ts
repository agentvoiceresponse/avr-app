import { ComponentLoader, OverridableComponent } from 'adminjs';
import path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const componentLoader = new ComponentLoader();

export const add = (url: string, componentName: string): string =>
  componentLoader.add(componentName, path.join(__dirname, url));
export const override = (url: string, componentName: OverridableComponent): string =>
  componentLoader.override(componentName, path.join(__dirname, url));

/**
 * Overridable components
 */
override('components/MyVersion', 'Version');
// override('components/MyLogin', 'Login');
override('components/MySidebarResourceSection', 'SidebarResourceSection');

/**
 * Common components
 */
export const EDIT_PROPERTY = add('components/EditProperty', 'EditProperty');
export const EDIT_PASSWORD_PROPERTY = add('components/EditPasswordProperty', 'EditPasswordProperty');
export const CONTAINER_LOGS = add('components/ContainerLogs', 'ContainerLogs');
export const DASHBOARD = add('components/Dashboard', 'Dashboard');

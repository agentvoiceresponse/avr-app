import Docker, { Container, ContainerCreateOptions, ContainerInspect } from 'dockerode';

const docker = new Docker();

export const logContainer = async (containerName: string): Promise<ContainerInspect> => {
  const container: Container = docker.getContainer(containerName);
  return await container.logs({ follow: false, stdout: true, stderr: true });
};

export const inspectContainer = async (containerName: string): Promise<ContainerInspect> => {
  const container: Container = docker.getContainer(containerName);
  return await container.inspect();
};

export const stopAndRemoveContainer = async (containerName: string): Promise<void> => {
  const container: Container = docker.getContainer(containerName);

  try {
    await container.inspect(); // Check if it exists
    console.log(`Container ${containerName} exists.`);
  } catch (err) {
    console.error(`Error stopping or removing the container ${containerName}:`, err.message);
  }

  try {
    await container.stop();
    console.log(`Container ${containerName} stopped.`);
  } catch (err) {
    console.error(`Error stopping or removing the container ${containerName}:`, err.message);
  }

  try {
    await container.remove();
    console.log(`Container ${containerName} removed.`);
  } catch (err) {
    console.error(`Error stopping or removing the container ${containerName}:`, err.message);
  }
};

export const createAndStartContainer = async (
  containerName: string,
  config: ContainerCreateOptions,
): Promise<Container> => {
  try {
    console.log(`Creating and starting the container ${containerName}...`);
    console.log(config);
    const newContainer = await docker.createContainer(config);
    await newContainer.start();
    console.log(`Container ${containerName} started successfully.`);
    return newContainer;
  } catch (err) {
    console.error(`Error creating or starting the container ${containerName}:`, err.message);
  }
};

export const ensureContainer = async (containerName: string, config: ContainerCreateOptions): Promise<Container> => {
  try {
    await stopAndRemoveContainer(containerName);
  } catch (err) {
    if (err.statusCode === 404) {
      console.log(`Container ${containerName} does not exist. It will be created...`);
    } else {
      console.error(`Error checking the container ${containerName}:`, err.message);
      return;
    }
  }

  return await createAndStartContainer(containerName, config);
};

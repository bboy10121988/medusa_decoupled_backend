const { MedusaModule } = require('@medusajs/framework/modules-sdk');
const { Modules } = require('@medusajs/framework/utils');

async function checkMedia() {
  const fileModule = await MedusaModule.bootstrap({
    moduleDefinition: require('@medusajs/framework/file').default,
    injectedDependencies: {}
  });
  
  console.log('Checking recent files...');
  const files = await fileModule.listFiles({ take: 5 });
  console.log(JSON.stringify(files, null, 2));
}

checkMedia().catch(console.error);

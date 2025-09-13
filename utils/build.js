process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";
process.env.ASSET_PATH = "/";

var webpack = require("webpack"),
  config = require("../webpack.config"),
  fs = require("fs"),
  path = require("path");

delete config.chromeExtensionBoilerplate;

config.mode = "production";

webpack(config, function (err, stats) {
  if (err) throw err;
  
  // Show build size information
  if (stats.hasErrors()) {
    console.error('Build failed with errors:', stats.toString());
    return;
  }
  
  console.log('Build completed successfully!');
  
  // Calculate and display bundle sizes
  const buildPath = path.join(__dirname, '..', 'build');
  if (fs.existsSync(buildPath)) {
    const files = fs.readdirSync(buildPath);
    let totalSize = 0;
    
    console.log('\n📦 Bundle Sizes:');
    console.log('================');
    
    files.forEach(file => {
      if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
        const filePath = path.join(buildPath, file);
        const stats = fs.statSync(filePath);
        const sizeInBytes = stats.size;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        
        totalSize += sizeInBytes;
        
        if (sizeInMB >= 1) {
          console.log(`${file}: ${sizeInMB} MB (${sizeInKB} KB)`);
        } else {
          console.log(`${file}: ${sizeInKB} KB`);
        }
      }
    });
    
    const totalKB = (totalSize / 1024).toFixed(2);
    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    console.log('================');
    console.log(`Total: ${totalMB} MB (${totalKB} KB)`);
  }
});

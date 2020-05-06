require("console");


const fsiServerApiClient = require("@neptunelabs/fsi-server-api-client");
const client = new fsiServerApiClient.FSIServerClient('http://fsi-dev.base.lan');
client.setLogLevel(fsiServerApiClient.FSIServerClient.LogLevel.trace)



client.login("admin", "admin")
	.then( () => {
		client.upload("c://Bilder/DSC04901_dt.jpg", "/images/hk test/",
			{flattenTargetPath:true, overwriteExisting:true})
			.then( (success) => {
				console.log("upload finished with result " + success);
			})
			.catch(console.error)
			.finally( () => {
				client.logout();
			})
	})
	.catch(console.error);

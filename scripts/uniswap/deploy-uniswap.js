import {ethers} from 'hardhat';
import {deployAll} from "./deploy-all";

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');

deployAll(provider)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => {
        console.log('--')
    })

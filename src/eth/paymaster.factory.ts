import { ethers } from "ethers";

export const checkPaymasterBalance = async (entrypoint: ethers.Contract, address: string) : Promise<boolean> => {

    let b = true;
    const balance = await entrypoint.balanceOf(address);

    if(balance < 500000) {
        console.log(`paymaster balance dangerously low!  ${ethers.formatEther(balance)}`)
        b = false;
    } else {
        console.log("paymaster balance = " + ethers.formatEther(balance))
    }

    return b;
}

export const logPaymasterBalance = async (entrypoint: ethers.Contract, address: string)  => {

    const balance = await entrypoint.balanceOf(address);
    console.log("paymaster balance = " + ethers.formatEther(balance))
}
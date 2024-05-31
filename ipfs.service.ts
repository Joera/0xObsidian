import { createHelia } from 'helia'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import { MemoryBlockstore } from 'blockstore-core'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { identify } from '@libp2p/identify'
import { tcp } from '@libp2p/tcp'
import { MemoryDatastore } from 'datastore-core'
import { createLibp2p } from 'libp2p'

export interface IIpfsService {

    init: () => void
    add: () => Promise<string>
    retrieve: (cid: string) => void
}

export class IpfsService implements IIpfsService {
    
    helia: any;
    fs: any;
    blockstore: any;
    datastore: any;

    constructor() { }

    async init() {

        this.blockstore = new MemoryBlockstore();
        this.datastore = new MemoryDatastore();

        const libp2p = await this.networking();

        this.helia = await createHelia({
            datastore : this.datastore,
            blockstore : this.blockstore,
            libp2p
        });

        this.fs = unixfs(this.helia);

        const multiaddrs = this.helia.libp2p.getMultiaddrs();
        console.log(multiaddrs.toString());
        
    }

    async networking() {

        return await createLibp2p({
            datastore: this.datastore,
            addresses: {
              listen: [
                '/ip4/127.0.0.1/tcp/0'
              ]
            },
            transports: [
              tcp()
            ],
            connectionEncryption: [
              noise()
            ],
            streamMuxers: [
              yamux()
            ],
            peerDiscovery: [
              bootstrap({
                list: [
                  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
                ]
              })
            ],
            services: {
              identify: identify()
            }
        })
    }

    async add() : Promise<string> {

        // we will use this TextEncoder to turn strings into Uint8Arrays
        const encoder = new TextEncoder()
        const bytes = encoder.encode('Hello Trisolarians')

        // add the bytes to your node and receive a unique content identifier
        const cid = await this.fs.addBytes(bytes)

        // console.log('Added file:', cid.toString())

        return cid;
    }

    async retrieve(cid: string) {

        console.log('hello');

        // this decoder will turn Uint8Arrays into strings
        const decoder = new TextDecoder()
        let text = ''

        for await (const chunk of this.fs.cat(cid)) {
            text += decoder.decode(chunk, {
                stream: true
            })
        }

        console.log('retrieved file contents:', text)

    }
}
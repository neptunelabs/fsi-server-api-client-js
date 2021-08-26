/*!
* A JavaScript implementation of the SHA256 hash function.
*
* FILE:	sha256.js
* VERSION:	0.8.1
* AUTHOR:	Christoph Bichlmeier <informatik@zombiearena.de>
*
* NOTE: This version is not tested thoroughly!
*
* Copyright (c) 2003, Christoph Bichlmeier
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions
* are met:
* 1. Redistributions of source code must retain the above copyright
*    notice, this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright
*    notice, this list of conditions and the following disclaimer in the
*    documentation and/or other materials provided with the distribution.
* 3. Neither the name of the copyright holder nor the names of contributors
*    may be used to endorse or promote products derived from this software
*    without specific prior written permission.
*
* ======================================================================
*
* THIS SOFTWARE IS PROVIDED BY THE AUTHORS ''AS IS'' AND ANY EXPRESS
* OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
* ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHORS OR CONTRIBUTORS BE
* LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
* CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
* SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
* BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
* WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
* OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
* EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


*  Modified by NeptuneLabs GmbH (transformed into ts class)
*/


const K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

const SHA256_HEX_DIGITS = "0123456789abcdef";

export class SHA256 {

    private iHash: number[] = [];
    private buffer: number[] = [];
    private count: number[] = [];

    private static rotateRight(n: number, x: number): number {
        return ((x >>> n) | (x << (32 - n)));
    }

    private static choice(x: number, y: number, z: number): number {
        return ((x & y) ^ (~x & z));
    }

    private static majority(x: number, y: number, z: number): number {
        return ((x & y) ^ (x & z) ^ (y & z));
    }

    private static getSigma0(x: number): number {
        return (SHA256.rotateRight(2, x) ^ SHA256.rotateRight(13, x) ^ SHA256.rotateRight(22, x));
    }

    private static getSigma1(x: number): number {
        return (SHA256.rotateRight(6, x) ^ SHA256.rotateRight(11, x) ^ SHA256.rotateRight(25, x));
    }

    private static sigma0(x: number): number {
        return (SHA256.rotateRight(7, x) ^ SHA256.rotateRight(18, x) ^ (x >>> 3));
    }

    private static sigma1(x: number): number {
        return (SHA256.rotateRight(17, x) ^ SHA256.rotateRight(19, x) ^ (x >>> 10));
    }

    private static expand(W: number[], j: number): number {
        return (W[j & 0x0f] += SHA256.sigma1(W[(j + 14) & 0x0f]) + W[(j + 9) & 0x0f] +
            SHA256.sigma0(W[(j + 1) & 0x0f]));
    }

    private static safeAdd(x: number, y: number): number {
        const lsw = (x & 0xffff) + (y & 0xffff);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
    }

    public hash(content: string): string | null {

        let ret: string | null = null;

        if (content !== null && content !== undefined) {
            ret = this.sha256Digest(content);
        }

        return ret;
    }

    public sha256Digest(data: string): string {
        this.sha256Init();
        this.sha256Update(data, data.length);
        this.sha256Final();
        return this.sha256EncodeHex();
    }

    private sha256Init(): void {
        this.iHash = new Array(8);
        this.count = new Array(2);
        this.buffer = new Array(64);
        this.count[0] = this.count[1] = 0;
        this.iHash[0] = 0x6a09e667;
        this.iHash[1] = 0xbb67ae85;
        this.iHash[2] = 0x3c6ef372;
        this.iHash[3] = 0xa54ff53a;
        this.iHash[4] = 0x510e527f;
        this.iHash[5] = 0x9b05688c;
        this.iHash[6] = 0x1f83d9ab;
        this.iHash[7] = 0x5be0cd19;
    }

    private sha256Transform(): void {
        let a, b, c, d, e, f, g, h, T1, T2;
        const iHash = this.iHash;
        const W: number[] = new Array(16);

        //  Initialize registers with the previous intermediate value 
        a = iHash[0];
        b = iHash[1];
        c = iHash[2];
        d = iHash[3];
        e = iHash[4];
        f = iHash[5];
        g = iHash[6];
        h = iHash[7];

        // make 32-bit words 
        for (let i = 0; i < 16; i++) {
            W[i] = ((this.buffer[(i << 2) + 3]) | (this.buffer[(i << 2) + 2] << 8) | (this.buffer[(i << 2) + 1]
                << 16) | (this.buffer[i << 2] << 24));
        }

        for (let j = 0; j < 64; j++) {
            T1 = h + SHA256.getSigma1(e) + SHA256.choice(e, f, g) + K256[j];
            if (j < 16) {
                T1 += W[j];
            } else {
                T1 += SHA256.expand(W, j);
            }
            T2 = SHA256.getSigma0(a) + SHA256.majority(a, b, c);
            h = g;
            g = f;
            f = e;
            e = SHA256.safeAdd(d, T1);
            d = c;
            c = b;
            b = a;
            a = SHA256.safeAdd(T1, T2);
        }

        // Compute the current intermediate hash value
        iHash[0] += a;
        iHash[1] += b;
        iHash[2] += c;
        iHash[3] += d;
        iHash[4] += e;
        iHash[5] += f;
        iHash[6] += g;
        iHash[7] += h;
    }

    private sha256Update(data: string, inputLen: number): void {
        let i, index, curPos = 0;
        // Compute number of bytes mod 64
        index = ((this.count[0] >> 3) & 0x3f);
        const remainder = (inputLen & 0x3f);

        // Update number of bits
        if ((this.count[0] += (inputLen << 3)) < (inputLen << 3)) {
            this.count[1]++;
        }
        this.count[1] += (inputLen >> 29);

        // Transform as many times as possible
        for (i = 0; i + 63 < inputLen; i += 64) {
            for (let j = index; j < 64; j++) {
                this.buffer[j] = data.charCodeAt(curPos++);
            }
            this.sha256Transform();
            index = 0;
        }

        // Buffer remaining input
        for (let j = 0; j < remainder; j++) {
            this.buffer[j] = data.charCodeAt(curPos++);
        }
    }

    private sha256Final(): void {
        const count = this.count;
        const buffer = this.buffer;

        let index = ((count[0] >> 3) & 0x3f);
        buffer[index++] = 0x80;
        if (index <= 56) {
            for (let i = index; i < 56; i++) {
                buffer[i] = 0;
            }
        } else {
            for (let i = index; i < 64; i++) {
                buffer[i] = 0;
            }
            this.sha256Transform();
            for (let i = 0; i < 56; i++) {
                buffer[i] = 0;
            }
        }
        buffer[56] = (count[1] >>> 24) & 0xff;
        buffer[57] = (count[1] >>> 16) & 0xff;
        buffer[58] = (count[1] >>> 8) & 0xff;
        buffer[59] = count[1] & 0xff;
        buffer[60] = (count[0] >>> 24) & 0xff;
        buffer[61] = (count[0] >>> 16) & 0xff;
        buffer[62] = (count[0] >>> 8) & 0xff;
        buffer[63] = count[0] & 0xff;
        this.sha256Transform();
    }

    private sha256EncodeHex(): string {
        let output = "";
        for (let i = 0; i < 8; i++) {
            for (let j = 28; j >= 0; j -= 4) {
                const z = this.iHash[i];
                output += SHA256_HEX_DIGITS.charAt((z >>> j) & 0x0f);
            }
        }
        return output;
    }
}

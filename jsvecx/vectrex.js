/*
JSVecX : JavaScript port of the VecX emulator by raz0red.
         Copyright (C) 2010-2019 raz0red

The original C version was written by Valavan Manohararajah
(http://valavan.net/vectrex.html).

Emulation of the AY-3-8910 / YM2149 sound chip.

Based on various code snippets by Ville Hallik, Michael Cuddy,
Tatsuyuki Satoh, Fabrice Frances, Nicola Salmoria.
*/
//////////////////////////////////////////////////////////////////////////
function fptr( value ) {
    this.value = value;
}
function Utils() {
    this.errorCount = 1;
    this.logCount = 500;
    this.showError = function( error ) {
        if( this.errorCount > 0 ) {
            console.log(error);
            this.errorCount--;
        }
    }
    this.initArray = function( arr, value ) {
        for( var i = 0; i < arr.length; i++ ) {
            arr[i] = value;
        }
    }
}
var utils = new Utils();
//////////////////////////////////////////////////////////////////////////
var Globals = {
    romdata: null,
    cartdata: null,
    VECTREX_MHZ: 1500000,
    VECTREX_COLORS: 128,
    ALG_MAX_X: 33000,
    ALG_MAX_Y: 41000,
    VECTREX_PDECAY: 30,
    VECTOR_HASH: 65521,
    SCREEN_X_DEFAULT: 330,
    SCREEN_Y_DEFAULT: 410
}
Globals.FCYCLES_INIT = Globals.VECTREX_MHZ / Globals.VECTREX_PDECAY >> 0;
Globals.VECTOR_CNT = Globals.VECTREX_MHZ / Globals.VECTREX_PDECAY >> 0;
//////////////////////////////////////////////////////////////////////////
function e6809() {
    this.vecx = null;
    this.FLAG_E = 0x80;
    this.FLAG_F = 0x40;
    this.FLAG_H = 0x20;
    this.FLAG_I = 0x10;
    this.FLAG_N = 0x08;
    this.FLAG_Z = 0x04;
    this.FLAG_V = 0x02;
    this.FLAG_C = 0x01;
    this.IRQ_NORMAL = 0;
    this.IRQ_SYNC = 1;
    this.IRQ_CWAI = 2;
    this.reg_x = new fptr(0);
    this.reg_y = new fptr(0);
    this.reg_u = new fptr(0);
    this.reg_s = new fptr(0);
    this.reg_pc = 0;
    this.reg_a = 0;
    this.reg_b = 0;
    this.reg_dp = 0;
    this.reg_cc = 0;
    this.irq_status = 0;
    this.rptr_xyus = [ this.reg_x, this.reg_y, this.reg_u, this.reg_s ];
    this.test_c = function( i0, i1, r, sub ) {
        var flag = (i0 | i1) & ~r;
        flag |= (i0 & i1);
        flag = (flag >> 7) & 1;
        flag ^= sub;
        return flag;
    }
    this.test_z8 = function( r ) {
        var flag = ~r;
        flag = (flag >> 4) & (flag & 0xf);
        flag = (flag >> 2) & (flag & 0x3);
        flag = (flag >> 1) & (flag & 0x1);
        return flag;
    }
    this.test_z16 = function( r ) {
        var flag = ~r;
        flag = (flag >> 8) & (flag & 0xff);
        flag = (flag >> 4) & (flag & 0xf);
        flag = (flag >> 2) & (flag & 0x3);
        flag = (flag >> 1) & (flag & 0x1);
        return flag;
    }
    this.test_v = function( i0, i1, r ) {
        var flag = ~(i0 ^ i1);
        flag &= (i0 ^ r);
        flag = (flag >> 7) & 1;
        return flag;
    }
    this.set_reg_d = function( value ) {
        this.reg_a = (value >> 8);
        this.reg_b = value;
    }
    this.read16 = function( address ) {
        var datahi = this.vecx.read8(address);
        var datalo = this.vecx.read8(address + 1);
        return (datahi << 8) | datalo;
    }
    this.write16 = function( address, data ) {
        this.vecx.write8(address, data >> 8);
        this.vecx.write8(address + 1, data);
    }
    this.push8 = function( sp, data ) {
        sp.value--;
        this.vecx.write8(sp.value, data);
    }
    this.push16 = function( sp, data ) {
        sp.value--;
        this.vecx.write8(sp.value, data);
        sp.value--;
        this.vecx.write8(sp.value, data >> 8 );
    }
    this.pull16 = function( sp ) {
        var datahi = this.vecx.read8(sp.value++);
        var datalo = this.vecx.read8(sp.value++);
        return (datahi << 8) | datalo;
    }
    this.pc_read16 = function() {
        var data = this.read16(this.reg_pc);
        this.reg_pc += 2;
        return data;
    }
    this.sign_extend = function( data ) {
        return (~(data & 0x80) + 1) | (data & 0xff);
    }
    this.ea_indexed = function( cycles ) {
        var ea = 0;
        var op = 0;
        var r = 0;
        op = this.vecx.read8(this.reg_pc++);
        r = (op >> 5) & 3;
        switch( op ) {
            case 0x00: case 0x01: case 0x02: case 0x03:
            case 0x04: case 0x05: case 0x06: case 0x07:
            case 0x08: case 0x09: case 0x0a: case 0x0b:
            case 0x0c: case 0x0d: case 0x0e: case 0x0f:
            case 0x20: case 0x21: case 0x22: case 0x23:
            case 0x24: case 0x25: case 0x26: case 0x27:
            case 0x28: case 0x29: case 0x2a: case 0x2b:
            case 0x2c: case 0x2d: case 0x2e: case 0x2f:
            case 0x40: case 0x41: case 0x42: case 0x43:
            case 0x44: case 0x45: case 0x46: case 0x47:
            case 0x48: case 0x49: case 0x4a: case 0x4b:
            case 0x4c: case 0x4d: case 0x4e: case 0x4f:
            case 0x60: case 0x61: case 0x62: case 0x63:
            case 0x64: case 0x65: case 0x66: case 0x67:
            case 0x68: case 0x69: case 0x6a: case 0x6b:
            case 0x6c: case 0x6d: case 0x6e: case 0x6f:
                ea = this.rptr_xyus[r].value + (op & 0xf);
                cycles.value++;
                break;
            case 0x10: case 0x11: case 0x12: case 0x13:
            case 0x14: case 0x15: case 0x16: case 0x17:
            case 0x18: case 0x19: case 0x1a: case 0x1b:
            case 0x1c: case 0x1d: case 0x1e: case 0x1f:
            case 0x30: case 0x31: case 0x32: case 0x33:
            case 0x34: case 0x35: case 0x36: case 0x37:
            case 0x38: case 0x39: case 0x3a: case 0x3b:
            case 0x3c: case 0x3d: case 0x3e: case 0x3f:
            case 0x50: case 0x51: case 0x52: case 0x53:
            case 0x54: case 0x55: case 0x56: case 0x57:
            case 0x58: case 0x59: case 0x5a: case 0x5b:
            case 0x5c: case 0x5d: case 0x5e: case 0x5f:
            case 0x70: case 0x71: case 0x72: case 0x73:
            case 0x74: case 0x75: case 0x76: case 0x77:
            case 0x78: case 0x79: case 0x7a: case 0x7b:
            case 0x7c: case 0x7d: case 0x7e: case 0x7f:
                ea = this.rptr_xyus[r].value + (op & 0xf) - 0x10;
                cycles.value++;
                break;
            case 0x80: case 0x81:
            case 0xa0: case 0xa1:
            case 0xc0: case 0xc1:
            case 0xe0: case 0xe1:
                ea = this.rptr_xyus[r].value;
                this.rptr_xyus[r].value+=(1 + (op & 1));
                cycles.value+=(2 + (op & 1));
                break;
            case 0x90: case 0x91:
            case 0xb0: case 0xb1:
            case 0xd0: case 0xd1:
            case 0xf0: case 0xf1:
                ea = this.read16(this.rptr_xyus[r].value);
                this.rptr_xyus[r].value+=(1 + (op & 1));
                cycles.value+=(5 + (op & 1));
                break;
            case 0x82: case 0x83:
            case 0xa2: case 0xa3:
            case 0xc2: case 0xc3:
            case 0xe2: case 0xe3:
                this.rptr_xyus[r].value-=(1 + (op & 1));
                ea = this.rptr_xyus[r].value;
                cycles.value+=(2 + (op & 1));
                break;
            case 0x92: case 0x93:
            case 0xb2: case 0xb3:
            case 0xd2: case 0xd3:
            case 0xf2: case 0xf3:
                this.rptr_xyus[r].value-=(1 + (op & 1));
                ea = this.read16(this.rptr_xyus[r].value);
                cycles.value+=(5 + (op & 1));
                break;
            case 0x84: case 0xa4:
            case 0xc4: case 0xe4:
                ea = this.rptr_xyus[r].value;
                break;
            case 0x94: case 0xb4:
            case 0xd4: case 0xf4:
                ea = this.read16(this.rptr_xyus[r].value);
                cycles.value+=(3);
                break;
            case 0x85: case 0xa5:
            case 0xc5: case 0xe5:
                ea = this.rptr_xyus[r].value + this.sign_extend(this.reg_b);
                cycles.value+=(1);
                break;
            case 0x95: case 0xb5:
            case 0xd5: case 0xf5:
                ea = this.read16(this.rptr_xyus[r].value + this.sign_extend(this.reg_b));
                cycles.value+=(4);
                break;
            case 0x86: case 0xa6:
            case 0xc6: case 0xe6:
                ea = this.rptr_xyus[r].value + this.sign_extend(this.reg_a);
                cycles.value+=(1);
                break;
            case 0x96: case 0xb6:
            case 0xd6: case 0xf6:
                ea = this.read16(this.rptr_xyus[r].value + this.sign_extend(this.reg_a));
                cycles.value+=(4);
            break;
            case 0x88: case 0xa8:
            case 0xc8: case 0xe8:
                ea = this.rptr_xyus[r].value + this.sign_extend(this.vecx.read8(this.reg_pc++));
                cycles.value+=(1);
                break;
            case 0x98: case 0xb8:
            case 0xd8: case 0xf8:
                ea = this.read16(this.rptr_xyus[r].value + this.sign_extend(this.vecx.read8(this.reg_pc++)));
                cycles.value+=(4);
                break;
            case 0x89: case 0xa9:
            case 0xc9: case 0xe9:
                ea = this.rptr_xyus[r].value + this.pc_read16();
                cycles.value+=(4);
                break;
            case 0x99: case 0xb9:
            case 0xd9: case 0xf9:
                ea = this.read16(this.rptr_xyus[r].value + this.pc_read16());
                cycles.value+=(7);
                break;
            case 0x8b: case 0xab:
            case 0xcb: case 0xeb:
                ea = this.rptr_xyus[r].value +  ((this.reg_a<<8)|(this.reg_b&0xff)) ;
                cycles.value+=(4);
                break;
            case 0x9b: case 0xbb:
            case 0xdb: case 0xfb:
                ea = this.read16(this.rptr_xyus[r].value +  ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(7);
                break;
            case 0x8c: case 0xac:
            case 0xcc: case 0xec:
                r = this.sign_extend(this.vecx.read8(this.reg_pc++));
                ea = this.reg_pc + r;
                cycles.value+=(1);
                break;
            case 0x9c: case 0xbc:
            case 0xdc: case 0xfc:
                r = this.sign_extend(this.vecx.read8(this.reg_pc++));
                ea = this.read16(this.reg_pc + r);
                cycles.value+=(4);
                break;
            case 0x8d: case 0xad:
            case 0xcd: case 0xed:
                r = this.pc_read16();
                ea = this.reg_pc + r;
                cycles.value+=(5);
                break;
            case 0x9d: case 0xbd:
            case 0xdd: case 0xfd:
                r = this.pc_read16();
                ea = this.read16(this.reg_pc + r);
                cycles.value+=(8);
                break;
            case 0x9f:
                ea = this.read16(this.pc_read16());
                cycles.value+=(5);
                break;
            default:
                console.log("undefined post-byte");
                break;
        }
        return ea;
    }
    this.inst_neg = function( data ) {
        var i0 = 0;
        var i1 = (~data) & 0xffff;
        var r = i0 + i1 + 1;
        this.reg_cc=((this.reg_cc&~this.FLAG_H)|(this.test_c(i0 << 4, i1 << 4, r << 4, 0)*this.FLAG_H)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, r, 1)*this.FLAG_C)) ;
        return r;
    }
    this.inst_com = function( data ) {
        var r = (~data) & 0xffff;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|(0*this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(1*this.FLAG_C)) ;
        return r;
    }
    this.inst_lsr = function( data ) {
        var r = (data >> 1) & 0x7f;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|(0*this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(data & 1*this.FLAG_C)) ;
        return r;
    }
    this.inst_ror = function( data ) {
        var c =  ((this.reg_cc/this.FLAG_C>>0)&1) ;
        var r = ((data >> 1) & 0x7f) | (c << 7);
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(data & 1*this.FLAG_C)) ;
        return r;
    }
    this.inst_asr = function( data ) {
        var r = ((data >> 1) & 0x7f) | (data & 0x80);
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(data & 1*this.FLAG_C)) ;
        return r;
    }
    this.inst_asl = function( data ) {
        var i0 = data;
        var i1 = data;
        var r = i0 + i1;
        this.reg_cc=((this.reg_cc&~this.FLAG_H)|(this.test_c(i0 << 4, i1 << 4, r << 4, 0)*this.FLAG_H)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, r, 0)*this.FLAG_C)) ;
        return r;
    }
    this.inst_rol = function( data ) {
        var i0 = data;
        var i1 = data;
        var c =  ((this.reg_cc/this.FLAG_C>>0)&1) ;
        var r = i0 + i1 + c;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, r, 0)*this.FLAG_C)) ;
        return r;
    }
    this.inst_dec = function( data ) {
        var i0 = data;
        var i1 = 0xff;
        var r = i0 + i1;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        return r;
    }
    this.inst_inc = function( data ) {
        var i0 = data;
        var i1 = 1;
        var r = i0 + i1;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        return r;
    }
    this.inst_tst8 = function( data ) {
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((data>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(data)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|(0*this.FLAG_V)) ;
    }
    this.inst_tst16 = function( data ) {
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((data >> 8>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z16(data)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|(0*this.FLAG_V)) ;
    }
    this.inst_clr = function() {
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|(0*this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(1*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|(0*this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(0*this.FLAG_C)) ;
    }
    this.inst_sub8 = function( data0, data1 ) {
        var i0 = data0;
        var i1 = (~data1) & 0xffff;
        var r = i0 + i1 + 1;
        this.reg_cc=((this.reg_cc&~this.FLAG_H)|(this.test_c(i0 << 4, i1 << 4, r << 4, 0)*this.FLAG_H)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, r, 1)*this.FLAG_C)) ;
        return r;
    }
    this.inst_sbc = function( data0, data1 ) {
        var i0 = data0;
        var i1 = (~data1) & 0xffff;
        var c = 1 -  ((this.reg_cc/this.FLAG_C>>0)&1) ;
        var r = i0 + i1 + c;
        this.reg_cc=((this.reg_cc&~this.FLAG_H)|(this.test_c(i0 << 4, i1 << 4, r << 4, 0)*this.FLAG_H)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, r, 1)*this.FLAG_C)) ;
        return r;
    }
    this.inst_and = function( data0, data1 ) {
        var r = data0 & data1;
        this.inst_tst8(r);
        return r;
    }
    this.inst_eor = function ( data0, data1 ) {
        var r = data0 ^ data1;
        this.inst_tst8(r);
        return r;
    }
    this.inst_adc = function ( data0, data1 ) {
        var i0 = data0;
        var i1 = data1;
        var c =  ((this.reg_cc/this.FLAG_C>>0)&1) ;
        var r = i0 + i1 + c;
        this.reg_cc=((this.reg_cc&~this.FLAG_H)|(this.test_c(i0 << 4, i1 << 4, r << 4, 0)*this.FLAG_H)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, r, 0)*this.FLAG_C)) ;
        return r;
    }
    this.inst_or = function( data0, data1 ) {
        var r = data0 | data1;
        this.inst_tst8(r);
        return r;
    }
    this.inst_add8 = function( data0, data1 ) {
        var i0 = data0;
        var i1 = data1;
        var r = i0 + i1;
        this.reg_cc=((this.reg_cc&~this.FLAG_H)|(this.test_c(i0 << 4, i1 << 4, r << 4, 0)*this.FLAG_H)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|( ((((~(i0^i1))&(i0^r))>>7)&1) *this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, r, 0)*this.FLAG_C)) ;
        return r;
    }
    this.inst_add16 = function( data0, data1 ) {
        var i0 = data0;
        var i1 = data1;
        var r = i0 + i1;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r >> 8>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z16(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|(this.test_v(i0 >> 8, i1 >> 8, r >> 8)*this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0 >> 8, i1 >> 8, r >> 8, 0)*this.FLAG_C)) ;
        return r;
    }
    this.inst_sub16 = function( data0, data1 ) {
        var i0 = data0;
        var i1 = (~data1) & 0xffff;
        var r = i0 + i1 + 1;
        this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((r >> 8>>7)&1) *this.FLAG_N)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z16(r)*this.FLAG_Z)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_V)|(this.test_v(i0 >> 8, i1 >> 8, r >> 8)*this.FLAG_V)) ;
        this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0 >> 8, i1 >> 8, r >> 8, 1)*this.FLAG_C)) ;
        return r;
    }
    this.inst_bra8 = function ( test, op, cycles ) {
        var offset = this.vecx.read8(this.reg_pc++);
        var mask = (test ^ (op & 1)) - 1;
        this.reg_pc += this.sign_extend(offset) & mask;
        cycles.value+=(3);
    }
    this.inst_bra16 = function( test, op, cycles ) {
        var offset = this.pc_read16();
        var mask = (test ^ (op & 1)) - 1;
        this.reg_pc += offset & mask;
        cycles.value+=(5 - mask);
    }
    this.inst_psh = function ( op, sp, data, cycles ) {
        if( op & 0x80 ) {
            this.push16(sp, this.reg_pc);
            cycles.value+=(2);
        }
        if( op & 0x40 ) {
            this.push16(sp, data);
            cycles.value+=(2);
        }
        if( op & 0x20 ) {
            this.push16(sp, this.reg_y.value);
            cycles.value+=(2);
        }
        if( op & 0x10 ) {
            this.push16(sp, this.reg_x.value);
            cycles.value+=(2);
        }
        if( op & 0x08 ) {
            this.push8(sp, this.reg_dp);
            cycles.value+=(1);
        }
        if( op & 0x04 ) {
            this.push8(sp, this.reg_b);
            cycles.value+=(1);
        }
        if( op & 0x02 ) {
            this.push8(sp, this.reg_a);
            cycles.value+=(1);
        }
        if( op & 0x01 ) {
            this.push8(sp, this.reg_cc);
            cycles.value+=(1);
        }
    }
    this.inst_pul = function( op, sp, osp, cycles ) {
        if( op & 0x01 ) {
            this.reg_cc =  (this.vecx.read8(sp.value++)) ;
            cycles.value+=(1);
        }
        if( op & 0x02 ) {
            this.reg_a =  (this.vecx.read8(sp.value++)) ;
            cycles.value+=(1);
        }
        if( op & 0x04 ) {
            this.reg_b =  (this.vecx.read8(sp.value++)) ;
            cycles.value+=(1);
        }
        if( op & 0x08 ) {
            this.reg_dp =  (this.vecx.read8(sp.value++)) ;
            cycles.value+=(1);
        }
        if( op & 0x10 ) {
            this.reg_x.value=(this.pull16(sp));
            cycles.value+=(2);
        }
        if( op & 0x20 ) {
            this.reg_y.value=(this.pull16(sp));
            cycles.value+=(2);
        }
        if( op & 0x40 ) {
            osp.value=(this.pull16(sp));
            cycles.value+=(2);
        }
        if( op & 0x80 ) {
            this.reg_pc = this.pull16(sp);
            cycles.value+=(2);
        }
    }
    this.exgtfr_read = function( reg ) {
        var data = 0;
        switch( reg ) {
            case 0x0:
                data = ((this.reg_a<<8)|(this.reg_b&0xff));
                break;
            case 0x1:
                data = this.reg_x.value;
                break;
            case 0x2:
                data = this.reg_y.value;
                break;
            case 0x3:
                data = this.reg_u.value;
                break;
            case 0x4:
                data = this.reg_s.value;
                break;
            case 0x5:
                data = this.reg_pc;
                break;
            case 0x8:
                data = 0xff00 | this.reg_a;
                break;
            case 0x9:
                data = 0xff00 | this.reg_b;
                break;
            case 0xa:
                data = 0xff00 | this.reg_cc;
                break;
            case 0xb:
                data = 0xff00 | this.reg_dp;
                break;
            default:
                data = 0xffff;
                utils.showError("illegal exgtfr reg" + reg);
                break;
        }
        return data;
    }
    this.exgtfr_write = function( reg, data ) {
        switch( reg ) {
            case 0x0:
                this.set_reg_d(data);
                break;
            case 0x1:
                this.reg_x.value=(data);
                break;
            case 0x2:
                this.reg_y.value=(data);
                break;
            case 0x3:
                this.reg_u.value=(data);
                break;
            case 0x4:
                this.reg_s.value=(data);
                break;
            case 0x5:
                this.reg_pc = data;
                break;
            case 0x8:
                this.reg_a = data;
                break;
            case 0x9:
                this.reg_b = data;
                break;
            case 0xa:
                this.reg_cc = data;
                break;
            case 0xb:
                this.reg_dp = data;
                break;
            default:
                utils.showError("illegal exgtfr reg " + reg)
                break;
        }
    }
    this.inst_exg = function() {
        var op = this.vecx.read8(this.reg_pc++);
        var tmp = this.exgtfr_read(op & 0xf);
        this.exgtfr_write(op & 0xf, this.exgtfr_read(op >> 4));
        this.exgtfr_write(op >> 4, tmp);
    }
    this.inst_tfr = function() {
        var op = this.vecx.read8(this.reg_pc++);
        this.exgtfr_write(op & 0xf, this.exgtfr_read(op >> 4));
    }
    this.e6809_reset = function() {
        this.reg_x.value=(0);
        this.reg_y.value=(0);
        this.reg_u.value=(0);
        this.reg_s.value=(0);
        this.reg_a = 0;
        this.reg_b = 0;
        this.reg_dp = 0;
        this.reg_cc = this.FLAG_I | this.FLAG_F;
        this.irq_status = this.IRQ_NORMAL;
        this.reg_pc = this.read16(0xfffe);
    }
    this.cycles = new fptr(0);
    this.e6809_sstep = function( irq_i, irq_f ) {
        var op = 0;
        var cycles = this.cycles;
        cycles.value=(0);
        var ea = 0;
        var i0 = 0;
        var i1 = 0;
        var r = 0;
        if( irq_f ) {
            if(  ((this.reg_cc/this.FLAG_F>>0)&1)  == 0 ) {
                if( this.irq_status != this.IRQ_CWAI ) {
                    this.reg_cc=((this.reg_cc&~this.FLAG_E)|(0*this.FLAG_E)) ;
                    this.inst_psh(0x81, this.reg_s, this.reg_u.value, cycles);
                }
                this.reg_cc=((this.reg_cc&~this.FLAG_I)|(1*this.FLAG_I)) ;
                this.reg_cc=((this.reg_cc&~this.FLAG_F)|(1*this.FLAG_F)) ;
                this.reg_pc = this.read16(0xfff6);
                this.irq_status = this.IRQ_NORMAL;
                cycles.value+=(7);
            } else {
                if( this.irq_status == this.IRQ_SYNC ) {
                    this.irq_status = this.IRQ_NORMAL;
                }
            }
        }
        if( irq_i ) {
            if(  ((this.reg_cc/this.FLAG_I>>0)&1)  == 0 ) {
                if( this.irq_status != this.IRQ_CWAI ) {
                    this.reg_cc=((this.reg_cc&~this.FLAG_E)|(1*this.FLAG_E)) ;
                    this.inst_psh(0xff, this.reg_s, this.reg_u.value, cycles);
                }
                this.reg_cc=((this.reg_cc&~this.FLAG_I)|(1*this.FLAG_I)) ;
                this.reg_pc = this.read16(0xfff8);
                this.irq_status = this.IRQ_NORMAL;
                cycles.value+=(7);
            } else {
                if( this.irq_status == this.IRQ_SYNC ) {
                    this.irq_status = this.IRQ_NORMAL;
                }
            }
        }
        if( this.irq_status != this.IRQ_NORMAL ) {
            return cycles.value + 1;
        }
        op = this.vecx.read8(this.reg_pc++);
        switch( op ) {
            case 0x00:
                ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                r = this.inst_neg(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x40:
                this.reg_a = this.inst_neg(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x50:
                this.reg_b = this.inst_neg(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x60:
                ea = this.ea_indexed(cycles);
                r = this.inst_neg(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x70:
                ea = this.pc_read16();
                r = this.inst_neg(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x03:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                r = this.inst_com(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x43:
                this.reg_a = this.inst_com(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x53:
                this.reg_b = this.inst_com(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x63:
                ea = this.ea_indexed(cycles);
                r = this.inst_com(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x73:
                ea = this.pc_read16();
                r = this.inst_com(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x04:
                ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                r = this.inst_lsr(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x44:
                this.reg_a = this.inst_lsr(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x54:
                this.reg_b = this.inst_lsr(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x64:
                ea = this.ea_indexed(cycles);
                r = this.inst_lsr(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x74:
                ea = this.pc_read16();
                r = this.inst_lsr(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x06:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                r = this.inst_ror(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x46:
                this.reg_a = this.inst_ror(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x56:
                this.reg_b = this.inst_ror(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x66:
                ea = this.ea_indexed(cycles);
                r = this.inst_ror(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x76:
                ea = this.pc_read16();
                r = this.inst_ror(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x07:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                r = this.inst_asr(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x47:
                this.reg_a = this.inst_asr(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x57:
                this.reg_b = this.inst_asr(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x67:
                ea = this.ea_indexed(cycles);
                r = this.inst_asr(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x77:
                ea = this.pc_read16();
                r = this.inst_asr(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x08:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                r = this.inst_asl(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x48:
                this.reg_a = this.inst_asl(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x58:
                this.reg_b = this.inst_asl(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x68:
                ea = this.ea_indexed(cycles);
                r = this.inst_asl(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x78:
                ea = this.pc_read16();
                r = this.inst_asl(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x09:
                ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                r = this.inst_rol(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x49:
                this.reg_a = this.inst_rol(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x59:
                this.reg_b = this.inst_rol(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x69:
                ea = this.ea_indexed(cycles);
                r = this.inst_rol(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x79:
                ea = this.pc_read16();
                r = this.inst_rol(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x0a:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                r = this.inst_dec(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x4a:
                this.reg_a = this.inst_dec(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x5a:
                this.reg_b = this.inst_dec(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x6a:
                ea = this.ea_indexed(cycles);
                r = this.inst_dec(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x7a:
                ea = this.pc_read16();
                r = this.inst_dec(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x0c:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                r = this.inst_inc(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x4c:
                this.reg_a = this.inst_inc(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x5c:
                this.reg_b = this.inst_inc(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x6c:
                ea = this.ea_indexed(cycles);
                r = this.inst_inc(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(6);
                break;
            case 0x7c:
                ea = this.pc_read16();
                r = this.inst_inc(this.vecx.read8(ea));
                this.vecx.write8(ea, r);
                cycles.value+=(7);
                break;
            case 0x0d:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.inst_tst8(this.vecx.read8(ea));
                cycles.value+=(6);
                break;
            case 0x4d:
                this.inst_tst8(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x5d:
                this.inst_tst8(this.reg_b);
                cycles.value+=(2);
                break;
            case 0x6d:
                ea = this.ea_indexed(cycles);
                this.inst_tst8(this.vecx.read8(ea));
                cycles.value+=(6);
                break;
            case 0x7d:
                ea = this.pc_read16();
                this.inst_tst8(this.vecx.read8(ea));
                cycles.value+=(7);
                break;
            case 0x0e:
                this.reg_pc = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                cycles.value+=(3);
                break;
            case 0x6e:
                this.reg_pc = this.ea_indexed(cycles);
                cycles.value+=(3);
                break;
            case 0x7e:
                this.reg_pc = this.pc_read16();
                cycles.value+=(4);
                break;
            case 0x0f:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.inst_clr();
                this.vecx.write8(ea, 0);
                cycles.value+=(6);
                break;
            case 0x4f:
                this.inst_clr();
                this.reg_a = 0;
                cycles.value+=(2);
                break;
            case 0x5f:
                this.inst_clr();
                this.reg_b = 0;
                cycles.value+=(2);
                break;
            case 0x6f:
                ea = this.ea_indexed(cycles);
                this.inst_clr();
                this.vecx.write8(ea, 0);
                cycles.value+=(6);
                break;
            case 0x7f:
                ea = this.pc_read16();
                this.inst_clr();
                this.vecx.write8(ea, 0);
                cycles.value+=(7);
                break;
            case 0x80:
                this.reg_a = this.inst_sub8(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x90:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_a = this.inst_sub8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xa0:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.inst_sub8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xb0:
                ea = this.pc_read16();
                this.reg_a = this.inst_sub8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xc0:
                this.reg_b = this.inst_sub8(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xd0:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.inst_sub8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xe0:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.inst_sub8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xf0:
                ea = this.pc_read16();
                this.reg_b = this.inst_sub8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x81:
                this.inst_sub8(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x91:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.inst_sub8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xa1:
                ea = this.ea_indexed(cycles);
                this.inst_sub8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xb1:
                ea = this.pc_read16();
                this.inst_sub8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xc1:
                this.inst_sub8(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xd1:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.inst_sub8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xe1:
                ea = this.ea_indexed(cycles);
                this.inst_sub8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xf1:
                ea = this.pc_read16();
                this.inst_sub8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x82:
                this.reg_a = this.inst_sbc(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x92:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_a = this.inst_sbc(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xa2:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.inst_sbc(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xb2:
                ea = this.pc_read16();
                this.reg_a = this.inst_sbc(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xc2:
                this.reg_b = this.inst_sbc(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xd2:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.inst_sbc(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xe2:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.inst_sbc(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xf2:
                ea = this.pc_read16();
                this.reg_b = this.inst_sbc(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x84:
                this.reg_a = this.inst_and(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x94:
                ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                this.reg_a = this.inst_and(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xa4:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.inst_and(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xb4:
                ea = this.pc_read16();
                this.reg_a = this.inst_and(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xc4:
                this.reg_b = this.inst_and(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xd4:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.inst_and(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xe4:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.inst_and(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xf4:
                ea = this.pc_read16();
                this.reg_b = this.inst_and(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x85:
                this.inst_and(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x95:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.inst_and(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xa5:
                ea = this.ea_indexed(cycles);
                this.inst_and(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xb5:
                ea = this.pc_read16();
                this.inst_and(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xc5:
                this.inst_and(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xd5:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.inst_and(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xe5:
                ea = this.ea_indexed(cycles);
                this.inst_and(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xf5:
                ea = this.pc_read16();
                this.inst_and(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x86:
                this.reg_a = this.vecx.read8(this.reg_pc++);
                this.inst_tst8(this.reg_a);
                cycles.value+=(2);
                break;
            case 0x96:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_a = this.vecx.read8(ea);
                this.inst_tst8(this.reg_a);
                cycles.value+=(4);
                break;
            case 0xa6:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.vecx.read8(ea);
                this.inst_tst8(this.reg_a);
                cycles.value+=(4);
                break;
            case 0xb6:
                ea = this.pc_read16();
                this.reg_a = this.vecx.read8(ea);
                this.inst_tst8(this.reg_a);
                cycles.value+=(5);
                break;
            case 0xc6:
                this.reg_b = this.vecx.read8(this.reg_pc++);
                this.inst_tst8(this.reg_b);
                cycles.value+=(2);
                break;
            case 0xd6:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.vecx.read8(ea);
                this.inst_tst8(this.reg_b);
                cycles.value+=(4);
                break;
            case 0xe6:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.vecx.read8(ea);
                this.inst_tst8(this.reg_b);
                cycles.value+=(4);
                break;
            case 0xf6:
                ea = this.pc_read16();
                this.reg_b = this.vecx.read8(ea);
                this.inst_tst8(this.reg_b);
                cycles.value+=(5);
                break;
            case 0x97:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.vecx.write8(ea, this.reg_a);
                this.inst_tst8(this.reg_a);
                cycles.value+=(4);
                break;
            case 0xa7:
                ea = this.ea_indexed(cycles);
                this.vecx.write8(ea, this.reg_a);
                this.inst_tst8(this.reg_a);
                cycles.value+=(4);
                break;
            case 0xb7:
                ea = this.pc_read16();
                this.vecx.write8(ea, this.reg_a);
                this.inst_tst8(this.reg_a);
                cycles.value+=(5);
                break;
            case 0xd7:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.vecx.write8(ea, this.reg_b);
                this.inst_tst8(this.reg_b);
                cycles.value+=(4);
                break;
            case 0xe7:
                ea = this.ea_indexed(cycles);
                this.vecx.write8(ea, this.reg_b);
                this.inst_tst8(this.reg_b);
                cycles.value+=(4);
                break;
            case 0xf7:
                ea = this.pc_read16();
                this.vecx.write8(ea, this.reg_b);
                this.inst_tst8(this.reg_b);
                cycles.value+=(5);
                break;
            case 0x88:
                this.reg_a = this.inst_eor(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x98:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_a = this.inst_eor(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xa8:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.inst_eor(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xb8:
                ea = this.pc_read16();
                this.reg_a = this.inst_eor(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xc8:
                this.reg_b = this.inst_eor(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xd8:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.inst_eor(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xe8:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.inst_eor(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xf8:
                ea = this.pc_read16();
                this.reg_b = this.inst_eor(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x89:
                this.reg_a = this.inst_adc(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x99:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_a = this.inst_adc(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xa9:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.inst_adc(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xb9:
                ea = this.pc_read16();
                this.reg_a = this.inst_adc(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xc9:
                this.reg_b = this.inst_adc(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xd9:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.inst_adc(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xe9:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.inst_adc(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xf9:
                ea = this.pc_read16();
                this.reg_b = this.inst_adc(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x8a:
                this.reg_a = this.inst_or(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x9a:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_a = this.inst_or(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xaa:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.inst_or(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xba:
                ea = this.pc_read16();
                this.reg_a = this.inst_or(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xca:
                this.reg_b = this.inst_or(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xda:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.inst_or(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xea:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.inst_or(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xfa:
                ea = this.pc_read16();
                this.reg_b = this.inst_or(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x8b:
                this.reg_a = this.inst_add8(this.reg_a, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0x9b:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_a = this.inst_add8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xab:
                ea = this.ea_indexed(cycles);
                this.reg_a = this.inst_add8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xbb:
                ea = this.pc_read16();
                this.reg_a = this.inst_add8(this.reg_a, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0xcb:
                this.reg_b = this.inst_add8(this.reg_b, this.vecx.read8(this.reg_pc++));
                cycles.value+=(2);
                break;
            case 0xdb:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_b = this.inst_add8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xeb:
                ea = this.ea_indexed(cycles);
                this.reg_b = this.inst_add8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(4);
                break;
            case 0xfb:
                ea = this.pc_read16();
                this.reg_b = this.inst_add8(this.reg_b, this.vecx.read8(ea));
                cycles.value+=(5);
                break;
            case 0x83:
                this.set_reg_d(this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.pc_read16()));
                cycles.value+=(4);
                break;
            case 0x93:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.set_reg_d(this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea)));
                cycles.value+=(6);
                break;
            case 0xa3:
                ea = this.ea_indexed(cycles);
                this.set_reg_d(this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea)));
                cycles.value+=(6);
                break;
            case 0xb3:
                ea = this.pc_read16();
                this.set_reg_d(this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea)));
                cycles.value+=(7);
                break;
            case 0x8c:
                this.inst_sub16(this.reg_x.value, this.pc_read16());
                cycles.value+=(4);
                break;
            case 0x9c:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.inst_sub16(this.reg_x.value, this.read16(ea));
                cycles.value+=(6);
                break;
            case 0xac:
                ea = this.ea_indexed(cycles);
                this.inst_sub16(this.reg_x.value, this.read16(ea));
                cycles.value+=(6);
                break;
            case 0xbc:
                ea = this.pc_read16();
                this.inst_sub16(this.reg_x.value, this.read16(ea));
                cycles.value+=(7);
                break;
            case 0x8e:
                this.reg_x.value=(this.pc_read16());
                this.inst_tst16(this.reg_x.value);
                cycles.value+=(3);
                break;
            case 0x9e:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_x.value=(this.read16(ea));
                this.inst_tst16(this.reg_x.value);
                cycles.value+=(5);
                break;
            case 0xae:
                ea = this.ea_indexed(cycles);
                this.reg_x.value=(this.read16(ea));
                this.inst_tst16(this.reg_x.value);
                cycles.value+=(5);
                break;
            case 0xbe:
                ea = this.pc_read16();
                this.reg_x.value=(this.read16(ea));
                this.inst_tst16(this.reg_x.value);
                cycles.value+=(6);
                break;
            case 0xce:
                this.reg_u.value=(this.pc_read16());
                this.inst_tst16(this.reg_u.value);
                cycles.value+=(3);
                break;
            case 0xde:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.reg_u.value=(this.read16(ea));
                this.inst_tst16(this.reg_u.value);
                cycles.value+=(5);
                break;
            case 0xee:
                ea = this.ea_indexed(cycles);
                this.reg_u.value=(this.read16(ea));
                this.inst_tst16(this.reg_u.value);
                cycles.value+=(5);
                break;
            case 0xfe:
                ea = this.pc_read16();
                this.reg_u.value=(this.read16(ea));
                this.inst_tst16(this.reg_u.value);
                cycles.value+=(6);
                break;
            case 0x9f:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.write16(ea, this.reg_x.value);
                this.inst_tst16(this.reg_x.value);
                cycles.value+=(5);
                break;
            case 0xaf:
                ea = this.ea_indexed(cycles);
                this.write16(ea, this.reg_x.value);
                this.inst_tst16(this.reg_x.value);
                cycles.value+=(5);
                break;
            case 0xbf:
                ea = this.pc_read16();
                this.write16(ea, this.reg_x.value);
                this.inst_tst16(this.reg_x.value);
                cycles.value+=(6);
                break;
            case 0xdf:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.write16(ea, this.reg_u.value);
                this.inst_tst16(this.reg_u.value);
                cycles.value+=(5);
                break;
            case 0xef:
                ea = this.ea_indexed(cycles);
                this.write16(ea, this.reg_u.value);
                this.inst_tst16(this.reg_u.value);
                cycles.value+=(5);
                break;
            case 0xff:
                ea = this.pc_read16();
                this.write16(ea, this.reg_u.value);
                this.inst_tst16(this.reg_u.value);
                cycles.value+=(6);
                break;
            case 0xc3:
                this.set_reg_d(this.inst_add16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.pc_read16()));
                cycles.value+=(4);
                break;
            case 0xd3:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.set_reg_d(this.inst_add16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea)));
                cycles.value+=(6);
                break;
            case 0xe3:
                ea = this.ea_indexed(cycles);
                this.set_reg_d(this.inst_add16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea)));
                cycles.value+=(6);
                break;
            case 0xf3:
                ea = this.pc_read16();
                this.set_reg_d(this.inst_add16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea)));
                cycles.value+=(7);
                break;
            case 0xcc:
                this.set_reg_d(this.pc_read16());
                this.inst_tst16( ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(3);
                break;
            case 0xdc:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.set_reg_d(this.read16(ea));
                this.inst_tst16( ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(5);
                break;
            case 0xec:
                ea = this.ea_indexed(cycles);
                this.set_reg_d(this.read16(ea));
                this.inst_tst16( ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(5);
                break;
            case 0xfc:
                ea = this.pc_read16();
                this.set_reg_d(this.read16(ea));
                this.inst_tst16( ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(6);
                break;
            case 0xdd:
                ea = ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++));
                this.write16(ea,  ((this.reg_a<<8)|(this.reg_b&0xff)) );
                this.inst_tst16( ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(5);
                break;
            case 0xed:
                ea = this.ea_indexed(cycles);
                this.write16(ea,  ((this.reg_a<<8)|(this.reg_b&0xff)) );
                this.inst_tst16( ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(5);
                break;
            case 0xfd:
                ea = this.pc_read16();
                this.write16(ea,  ((this.reg_a<<8)|(this.reg_b&0xff)) );
                this.inst_tst16( ((this.reg_a<<8)|(this.reg_b&0xff)) );
                cycles.value+=(6);
                break;
            case 0x12:
                cycles.value+=(2);
                break;
            case 0x3d:
                r = (this.reg_a & 0xff) * (this.reg_b & 0xff);
                this.set_reg_d(r);
                this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z16(r)*this.FLAG_Z)) ;
                this.reg_cc=((this.reg_cc&~this.FLAG_C)|((r >> 7) & 1*this.FLAG_C)) ;
                cycles.value+=(11);
                break;
            case 0x20:
            case 0x21:
                this.inst_bra8(0, op, cycles);
                break;
            case 0x22:
            case 0x23:
                this.inst_bra8( ((this.reg_cc/this.FLAG_C>>0)&1)  |  ((this.reg_cc/this.FLAG_Z>>0)&1) , op, cycles);
                break;
            case 0x24:
            case 0x25:
                this.inst_bra8( ((this.reg_cc/this.FLAG_C>>0)&1) , op, cycles);
                break;
            case 0x26:
            case 0x27:
                this.inst_bra8( ((this.reg_cc/this.FLAG_Z>>0)&1) , op, cycles);
                break;
            case 0x28:
            case 0x29:
                this.inst_bra8( ((this.reg_cc/this.FLAG_V>>0)&1) , op, cycles);
                break;
            case 0x2a:
            case 0x2b:
                this.inst_bra8( ((this.reg_cc/this.FLAG_N>>0)&1) , op, cycles);
                break;
            case 0x2c:
            case 0x2d:
                this.inst_bra8( ((this.reg_cc/this.FLAG_N>>0)&1)  ^  ((this.reg_cc/this.FLAG_V>>0)&1) , op, cycles);
                break;
            case 0x2e:
            case 0x2f:
                this.inst_bra8( ((this.reg_cc/this.FLAG_Z>>0)&1)  |
                               ( ((this.reg_cc/this.FLAG_N>>0)&1)  ^  ((this.reg_cc/this.FLAG_V>>0)&1) ), op, cycles);
                break;
            case 0x16:
                r = this.pc_read16();
                this.reg_pc += r;
                cycles.value+=(5);
                break;
            case 0x17:
                r = this.pc_read16();
                this.push16(this.reg_s, this.reg_pc);
                this.reg_pc += r;
                cycles.value+=(9);
                break;
            case 0x8d:
                r = this.vecx.read8(this.reg_pc++);
                this.push16(this.reg_s, this.reg_pc);
                this.reg_pc += this.sign_extend(r);
                cycles.value+=(7);
                break;
            case 0x9d:
                ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                this.push16(this.reg_s, this.reg_pc);
                this.reg_pc = ea;
                cycles.value+=(7);
                break;
            case 0xad:
                ea = this.ea_indexed(cycles);
                this.push16(this.reg_s, this.reg_pc);
                this.reg_pc = ea;
                cycles.value+=(7);
                break;
            case 0xbd:
                ea = this.pc_read16();
                this.push16(this.reg_s, this.reg_pc);
                this.reg_pc = ea;
                cycles.value+=(8);
                break;
            case 0x30:
                this.reg_x.value=(this.ea_indexed(cycles));
                this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z16(this.reg_x.value)*this.FLAG_Z)) ;
                cycles.value+=(4);
                break;
            case 0x31:
                this.reg_y.value=(this.ea_indexed(cycles));
                this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z16(this.reg_y.value)*this.FLAG_Z)) ;
                cycles.value+=(4);
                break;
            case 0x32:
                this.reg_s.value=(this.ea_indexed(cycles));
                cycles.value+=(4);
                break;
            case 0x33:
                this.reg_u.value=(this.ea_indexed(cycles));
                cycles.value+=(4);
                break;
            case 0x34:
                this.inst_psh(this.vecx.read8(this.reg_pc++), this.reg_s, this.reg_u.value, cycles);
                cycles.value+=(5);
                break;
            case 0x35:
                this.inst_pul(this.vecx.read8(this.reg_pc++), this.reg_s, this.reg_u, cycles);
                cycles.value+=(5);
                break;
            case 0x36:
                this.inst_psh(this.vecx.read8(this.reg_pc++), this.reg_u, this.reg_s.value, cycles);
                cycles.value+=(5);
                break;
            case 0x37:
                this.inst_pul(this.vecx.read8(this.reg_pc++), this.reg_u, this.reg_s, cycles);
                cycles.value+=(5);
                break;
            case 0x39:
                this.reg_pc = this.pull16(this.reg_s);
                cycles.value+=(5);
                break;
            case 0x3a:
                this.reg_x.value+=(this.reg_b & 0xff);
                cycles.value+=(3);
                break;
            case 0x1a:
                this.reg_cc |= this.vecx.read8(this.reg_pc++);
                cycles.value+=(3);
                break;
            case 0x1c:
                this.reg_cc &= this.vecx.read8(this.reg_pc++);
                cycles.value+=(3);
                break;
            case 0x1d:
                this.set_reg_d(this.sign_extend(this.reg_b));
                this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((this.reg_a>>7)&1) *this.FLAG_N)) ;
                this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z16( ((this.reg_a<<8)|(this.reg_b&0xff)) )*this.FLAG_Z)) ;
                cycles.value+=(2);
                break;
            case 0x1e:
                this.inst_exg();
                cycles.value+=(8);
                break;
            case 0x1f:
                this.inst_tfr();
                cycles.value+=(6);
                break;
            case 0x3b:
                if(  ((this.reg_cc/this.FLAG_E>>0)&1)  ) {
                    this.inst_pul(0xff, this.reg_s, this.reg_u, cycles);
                } else {
                    this.inst_pul(0x81, this.reg_s, this.reg_u, cycles);
                }
                cycles.value+=(3);
                break;
            case 0x3f:
                this.reg_cc=((this.reg_cc&~this.FLAG_E)|(1*this.FLAG_E)) ;
                this.inst_psh(0xff, this.reg_s, this.reg_u.value, cycles);
                this.reg_cc=((this.reg_cc&~this.FLAG_I)|(1*this.FLAG_I)) ;
                this.reg_cc=((this.reg_cc&~this.FLAG_F)|(1*this.FLAG_F)) ;
                this.reg_pc = this.read16(0xfffa);
                cycles.value+=(7);
                break;
            case 0x13:
                this.irq_status = this.IRQ_SYNC;
                cycles.value+=(2);
                break;
            case 0x19:
                i0 = this.reg_a;
                i1 = 0;
                if( (this.reg_a & 0x0f) > 0x09 ||  ((this.reg_cc/this.FLAG_H>>0)&1)  == 1 ) {
                    i1 |= 0x06;
                }
                if( (this.reg_a & 0xf0) > 0x80 && (this.reg_a & 0x0f) > 0x09 ) {
                    i1 |= 0x60;
                }
                if( (this.reg_a & 0xf0) > 0x90 ||  ((this.reg_cc/this.FLAG_C>>0)&1)  == 1 ) {
                    i1 |= 0x60;
                }
                this.reg_a = i0 + i1;
                this.reg_cc=((this.reg_cc&~this.FLAG_N)|( ((this.reg_a>>7)&1) *this.FLAG_N)) ;
                this.reg_cc=((this.reg_cc&~this.FLAG_Z)|(this.test_z8(this.reg_a)*this.FLAG_Z)) ;
                this.reg_cc=((this.reg_cc&~this.FLAG_V)|(0*this.FLAG_V)) ;
                this.reg_cc=((this.reg_cc&~this.FLAG_C)|(this.test_c(i0, i1, this.reg_a, 0)*this.FLAG_C)) ;
                cycles.value+=(2);
                break;
            case 0x3c:
                var val = this.vecx.read8(this.reg_pc++);
                this.reg_cc=((this.reg_cc&~this.FLAG_E)|(1*this.FLAG_E)) ;
                this.inst_psh(0xff, this.reg_s, this.reg_u.value, cycles);
                this.irq_status = this.IRQ_CWAI;
                this.reg_cc &= val;
                cycles.value+=(4);
                break;
            case 0x10:
                op = this.vecx.read8(this.reg_pc++);
                switch( op ) {
                    case 0x20:
                    case 0x21:
                        this.inst_bra16(0, op, cycles);
                        break;
                    case 0x22:
                    case 0x23:
                        this.inst_bra16( ((this.reg_cc/this.FLAG_C>>0)&1)  |  ((this.reg_cc/this.FLAG_Z>>0)&1) , op, cycles);
                        break;
                    case 0x24:
                    case 0x25:
                        this.inst_bra16( ((this.reg_cc/this.FLAG_C>>0)&1) , op, cycles);
                        break;
                    case 0x26:
                    case 0x27:
                        this.inst_bra16( ((this.reg_cc/this.FLAG_Z>>0)&1) , op, cycles);
                        break;
                    case 0x28:
                    case 0x29:
                        this.inst_bra16( ((this.reg_cc/this.FLAG_V>>0)&1) , op, cycles);
                        break;
                    case 0x2a:
                    case 0x2b:
                        this.inst_bra16( ((this.reg_cc/this.FLAG_N>>0)&1) , op, cycles);
                        break;
                    case 0x2c:
                    case 0x2d:
                        this.inst_bra16( ((this.reg_cc/this.FLAG_N>>0)&1)  ^  ((this.reg_cc/this.FLAG_V>>0)&1) , op, cycles);
                        break;
                    case 0x2e:
                    case 0x2f:
                        this.inst_bra16( ((this.reg_cc/this.FLAG_Z>>0)&1)  |
                                        ( ((this.reg_cc/this.FLAG_N>>0)&1)  ^  ((this.reg_cc/this.FLAG_V>>0)&1) ), op, cycles);
                        break;
                    case 0x83:
                        this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.pc_read16());
                        cycles.value+=(5);
                        break;
                    case 0x93:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xa3:
                        ea = this.ea_indexed(cycles);
                        this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xb3:
                        ea = this.pc_read16();
                        this.inst_sub16( ((this.reg_a<<8)|(this.reg_b&0xff)) , this.read16(ea));
                        cycles.value+=(8);
                        break;
                    case 0x8c:
                        this.inst_sub16(this.reg_y.value, this.pc_read16());
                        cycles.value+=(5);
                        break;
                    case 0x9c:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.inst_sub16(this.reg_y.value, this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xac:
                        ea = this.ea_indexed(cycles);
                        this.inst_sub16(this.reg_y.value, this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xbc:
                        ea = this.pc_read16();
                        this.inst_sub16(this.reg_y.value, this.read16(ea));
                        cycles.value+=(8);
                        break;
                    case 0x8e:
                        this.reg_y.value=(this.pc_read16());
                        this.inst_tst16(this.reg_y.value);
                        cycles.value+=(4);
                        break;
                    case 0x9e:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.reg_y.value=(this.read16(ea));
                        this.inst_tst16(this.reg_y.value);
                        cycles.value+=(6);
                        break;
                    case 0xae:
                        ea = this.ea_indexed(cycles);
                        this.reg_y.value=(this.read16(ea));
                        this.inst_tst16(this.reg_y.value);
                        cycles.value+=(6);
                        break;
                    case 0xbe:
                        ea = this.pc_read16();
                        this.reg_y.value=(this.read16(ea));
                        this.inst_tst16(this.reg_y.value);
                        cycles.value+=(7);
                        break;
                    case 0x9f:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.write16(ea, this.reg_y.value);
                        this.inst_tst16(this.reg_y.value);
                        cycles.value+=(6);
                        break;
                    case 0xaf:
                        ea = this.ea_indexed(cycles);
                        this.write16(ea, this.reg_y.value);
                        this.inst_tst16(this.reg_y.value);
                        cycles.value+=(6);
                        break;
                    case 0xbf:
                        ea = this.pc_read16();
                        this.write16(ea, this.reg_y.value);
                        this.inst_tst16(this.reg_y.value);
                        cycles.value+=(7);
                        break;
                    case 0xce:
                        this.reg_s.value=(this.pc_read16());
                        this.inst_tst16(this.reg_s.value);
                        cycles.value+=(4);
                        break;
                    case 0xde:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.reg_s.value=(this.read16(ea));
                        this.inst_tst16(this.reg_s.value);
                        cycles.value+=(6);
                        break;
                    case 0xee:
                        ea = this.ea_indexed(cycles);
                        this.reg_s.value=(this.read16(ea));
                        this.inst_tst16(this.reg_s.value);
                        cycles.value+=(6);
                        break;
                    case 0xfe:
                        ea = this.pc_read16();
                        this.reg_s.value=(this.read16(ea));
                        this.inst_tst16(this.reg_s.value);
                        cycles.value+=(7);
                        break;
                    case 0xdf:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.write16(ea, this.reg_s.value);
                        this.inst_tst16(this.reg_s.value);
                        cycles.value+=(6);
                        break;
                    case 0xef:
                        ea = this.ea_indexed(cycles);
                        this.write16(ea, this.reg_s.value);
                        this.inst_tst16(this.reg_s.value);
                        cycles.value+=(6);
                        break;
                    case 0xff:
                        ea = this.pc_read16();
                        this.write16(ea, this.reg_s.value);
                        this.inst_tst16(this.reg_s.value);
                        cycles.value+=(7);
                        break;
                    case 0x3f:
                        this.reg_cc=((this.reg_cc&~this.FLAG_E)|(1*this.FLAG_E)) ;
                        this.inst_psh(0xff, this.reg_s, this.reg_u.value, cycles);
                        this.reg_pc = this.read16(0xfff4);
                        cycles.value+=(8);
                        break;
                    default:
                        utils.showError("unknown page-1 op code: " + op);
                        break;
                }
                break;
            case 0x11:
                op = this.vecx.read8(this.reg_pc++);
                switch( op ) {
                    case 0x83:
                        this.inst_sub16(this.reg_u.value, this.pc_read16());
                        cycles.value+=(5);
                        break;
                    case 0x93:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.inst_sub16(this.reg_u.value, this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xa3:
                        ea = this.ea_indexed(cycles);
                        this.inst_sub16(this.reg_u.value, this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xb3:
                        ea = this.pc_read16();
                        this.inst_sub16(this.reg_u.value, this.read16(ea));
                        cycles.value+=(8);
                        break;
                    case 0x8c:
                        this.inst_sub16(this.reg_s.value, this.pc_read16());
                        cycles.value+=(5);
                        break;
                    case 0x9c:
                        ea =  ((this.reg_dp<<8)|this.vecx.read8(this.reg_pc++)) ;
                        this.inst_sub16(this.reg_s.value, this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xac:
                        ea = this.ea_indexed(cycles);
                        this.inst_sub16(this.reg_s.value, this.read16(ea));
                        cycles.value+=(7);
                        break;
                    case 0xbc:
                        ea = this.pc_read16();
                        this.inst_sub16(this.reg_s.value, this.read16(ea));
                        cycles.value+=(8);
                        break;
                    case 0x3f:
                        this.reg_cc=((this.reg_cc&~this.FLAG_E)|(1*this.FLAG_E)) ;
                        this.inst_psh(0xff, this.reg_s, this.reg_u.value, cycles);
                        this.reg_pc = this.read16(0xfff2);
                        cycles.value+=(8);
                        break;
                    default:
                        utils.showError("unknown page-2 op code: " + op);
                        break;
                }
                break;
            default:
                utils.showError("unknown page-0 op code: " + op);
                break;
        }
        return cycles.value;
    }
    this.init = function( vecx ) {
        this.vecx = vecx;
    }
}
//////////////////////////////////////////////////////////////////////////
function e8910() {
    this.psg = {
        index: 0,
        ready: 0,
        lastEnable: 0,
        PeriodA: 0,
        PeriodB: 0,
        PeriodC: 0,
        PeriodN: 0,
        PeriodE: 0,
        CountA: 0,
        CountB: 0,
        CountC: 0,
        CountN: 0,
        CountE: 0,
        VolA: 0,
        VolB: 0,
        VolC: 0,
        VolE: 0,
        EnvelopeA: 0,
        EnvelopeB: 0,
        EnvelopeC: 0,
        OutputA: 0,
        OutputB: 0,
        OutputC: 0,
        OutputN: 0,
        CountEnv: 0,
        Hold: 0,
        Alternate: 0,
        Attack: 0,
        Holding: 0,
        RNG: 0,
        VolTable: new Array(32),
        Regs: null
    };
    this.ctx = null;
    this.node = null;
    this.enabled = true;
    this.e8910_build_mixer_table = function() {
        var i;
        var out;
        out = 0x0fff;
        for (i = 31; i > 0; i--) {
            this.psg.VolTable[i] = (out + 0.5)>>>0;
            out /= 1.188502227;
        }
        this.psg.VolTable[0] = 0;
    }
    this.e8910_write = function(r, v) {
        var old;
        this.psg.Regs[r] = v;
        switch( r ) {
            case (0):
            case (1):
                this.psg.Regs[(1)] &= 0x0f;
                old = this.psg.PeriodA;
                this.psg.PeriodA = (this.psg.Regs[(0)] + 256 * this.psg.Regs[(1)]) * 1;
                if (this.psg.PeriodA == 0) this.psg.PeriodA = 1;
                this.psg.CountA += this.psg.PeriodA - old;
                if (this.psg.CountA <= 0) this.psg.CountA = 1;
                break;
            case (2):
            case (3):
                this.psg.Regs[(3)] &= 0x0f;
                old = this.psg.PeriodB;
                this.psg.PeriodB = (this.psg.Regs[(2)] + 256 * this.psg.Regs[(3)]) * 1;
                if (this.psg.PeriodB == 0) this.psg.PeriodB = 1;
                this.psg.CountB += this.psg.PeriodB - old;
                if (this.psg.CountB <= 0) this.psg.CountB = 1;
                break;
            case (4):
            case (5):
                this.psg.Regs[(5)] &= 0x0f;
                old = this.psg.PeriodC;
                this.psg.PeriodC = (this.psg.Regs[(4)] + 256 * this.psg.Regs[(5)]) * 1;
                if (this.psg.PeriodC == 0) this.psg.PeriodC = 1;
                this.psg.CountC += this.psg.PeriodC - old;
                if (this.psg.CountC <= 0) this.psg.CountC = 1;
                break;
            case (6):
                this.psg.Regs[(6)] &= 0x1f;
                old = this.psg.PeriodN;
                this.psg.PeriodN = this.psg.Regs[(6)] * 1;
                if (this.psg.PeriodN == 0) this.psg.PeriodN = 1;
                this.psg.CountN += this.psg.PeriodN - old;
                if (this.psg.CountN <= 0) this.psg.CountN = 1;
                break;
            case (7):
                this.psg.lastEnable = this.psg.Regs[(7)];
                break;
            case (8):
                this.psg.Regs[(8)] &= 0x1f;
                this.psg.EnvelopeA = this.psg.Regs[(8)] & 0x10;
                this.psg.VolA = this.psg.EnvelopeA ? this.psg.VolE : this.psg.VolTable[this.psg.Regs[(8)] ? this.psg.Regs[(8)]*2+1 : 0];
                break;
            case (9):
                this.psg.Regs[(9)] &= 0x1f;
                this.psg.EnvelopeB = this.psg.Regs[(9)] & 0x10;
                this.psg.VolB = this.psg.EnvelopeB ? this.psg.VolE : this.psg.VolTable[this.psg.Regs[(9)] ? this.psg.Regs[(9)]*2+1 : 0];
                break;
            case (10):
                this.psg.Regs[(10)] &= 0x1f;
                this.psg.EnvelopeC = this.psg.Regs[(10)] & 0x10;
                this.psg.VolC = this.psg.EnvelopeC ? this.psg.VolE : this.psg.VolTable[this.psg.Regs[(10)] ? this.psg.Regs[(10)]*2+1 : 0];
                break;
            case (11):
            case (12):
                old = this.psg.PeriodE;
                this.psg.PeriodE = ((this.psg.Regs[(11)] + 256 * this.psg.Regs[(12)])) * 1;
                //if (this.psg.PeriodE == 0) this.psg.PeriodE = 1 / 2;
                if (this.psg.PeriodE == 0) this.psg.PeriodE = 1;
                this.psg.CountE += this.psg.PeriodE - old;
                if (this.psg.CountE <= 0) this.psg.CountE = 1;
                break;
            case (13):
                this.psg.Regs[(13)] &= 0x0f;
                this.psg.Attack = (this.psg.Regs[(13)] & 0x04) ? 0x1f : 0x00;
                if ((this.psg.Regs[(13)] & 0x08) == 0) {
                    this.psg.Hold = 1;
                    this.psg.Alternate = this.psg.Attack;
                } else {
                    this.psg.Hold = this.psg.Regs[(13)] & 0x01;
                    this.psg.Alternate = this.psg.Regs[(13)] & 0x02;
                }
                this.psg.CountE = this.psg.PeriodE;
                this.psg.CountEnv = 0x1f;
                this.psg.Holding = 0;
                this.psg.VolE = this.psg.VolTable[this.psg.CountEnv ^ this.psg.Attack];
                if (this.psg.EnvelopeA) this.psg.VolA = this.psg.VolE;
                if (this.psg.EnvelopeB) this.psg.VolB = this.psg.VolE;
                if (this.psg.EnvelopeC) this.psg.VolC = this.psg.VolE;
                break;
            case (14):
                break;
            case (15):
                break;
        }
    }
    this.toggleEnabled = function() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    this.e8910_callback = function(stream, length) {
        var idx = 0;
        var outn = 0;
        if (!this.psg.ready || !this.enabled) {
            //memset(stream, 0, length * sizeof(*stream));
            for(var i = 0; i < length; i++) {
                stream[i] = 0;
            }
            return;
        }
        length = length << 1;
        if (this.psg.Regs[(7)] & 0x01) {
            if (this.psg.CountA <= length) this.psg.CountA += length;
            this.psg.OutputA = 1;
        } else if (this.psg.Regs[(8)] == 0) {
            if (this.psg.CountA <= length) this.psg.CountA += length;
        }
        if (this.psg.Regs[(7)] & 0x02) {
            if (this.psg.CountB <= length) this.psg.CountB += length;
            this.psg.OutputB = 1;
        } else if (this.psg.Regs[(9)] == 0) {
            if (this.psg.CountB <= length) this.psg.CountB += length;
        }
        if (this.psg.Regs[(7)] & 0x04) {
            if (this.psg.CountC <= length) this.psg.CountC += length;
            this.psg.OutputC = 1;
        } else if (this.psg.Regs[(10)] == 0) {
            if (this.psg.CountC <= length) this.psg.CountC += length;
        }
        if ((this.psg.Regs[(7)] & 0x38) == 0x38)
            if (this.psg.CountN <= length) this.psg.CountN += length;
        outn = (this.psg.OutputN | this.psg.Regs[(7)]);
        while (length > 0) {
            var vol;
            var left = 2;
            var vola, volb, volc;
            vola = volb = volc = 0;
            do {
                var nextevent;
                if (this.psg.CountN < left) nextevent = this.psg.CountN;
                else nextevent = left;
                if (outn & 0x08) {
                    if (this.psg.OutputA) vola += this.psg.CountA;
                    this.psg.CountA -= nextevent;
                    while (this.psg.CountA <= 0) {
                        this.psg.CountA += this.psg.PeriodA;
                        if (this.psg.CountA > 0) {
                            this.psg.OutputA ^= 1;
                            if (this.psg.OutputA) vola += this.psg.PeriodA;
                            break;
                        }
                        this.psg.CountA += this.psg.PeriodA;
                        vola += this.psg.PeriodA;
                    }
                    if (this.psg.OutputA) vola -= this.psg.CountA;
                } else {
                    this.psg.CountA -= nextevent;
                    while (this.psg.CountA <= 0) {
                        this.psg.CountA += this.psg.PeriodA;
                        if (this.psg.CountA > 0) {
                            this.psg.OutputA ^= 1;
                            break;
                        }
                        this.psg.CountA += this.psg.PeriodA;
                    }
                }
                if (outn & 0x10) {
                    if (this.psg.OutputB) volb += this.psg.CountB;
                    this.psg.CountB -= nextevent;
                    while (this.psg.CountB <= 0) {
                        this.psg.CountB += this.psg.PeriodB;
                        if (this.psg.CountB > 0) {
                            this.psg.OutputB ^= 1;
                            if (this.psg.OutputB) volb += this.psg.PeriodB;
                            break;
                        }
                        this.psg.CountB += this.psg.PeriodB;
                        volb += this.psg.PeriodB;
                    }
                    if (this.psg.OutputB) volb -= this.psg.CountB;
                } else {
                    this.psg.CountB -= nextevent;
                    while (this.psg.CountB <= 0) {
                        this.psg.CountB += this.psg.PeriodB;
                        if (this.psg.CountB > 0) {
                            this.psg.OutputB ^= 1;
                            break;
                        }
                        this.psg.CountB += this.psg.PeriodB;
                    }
                }
                if (outn & 0x20) {
                    if (this.psg.OutputC) volc += this.psg.CountC;
                    this.psg.CountC -= nextevent;
                    while (this.psg.CountC <= 0) {
                        this.psg.CountC += this.psg.PeriodC;
                        if (this.psg.CountC > 0) {
                            this.psg.OutputC ^= 1;
                            if (this.psg.OutputC) volc += this.psg.PeriodC;
                            break;
                        }
                        this.psg.CountC += this.psg.PeriodC;
                        volc += this.psg.PeriodC;
                    }
                    if (this.psg.OutputC) volc -= this.psg.CountC;
                } else {
                    this.psg.CountC -= nextevent;
                    while (this.psg.CountC <= 0) {
                        this.psg.CountC += this.psg.PeriodC;
                        if (this.psg.CountC > 0) {
                            this.psg.OutputC ^= 1;
                            break;
                        }
                        this.psg.CountC += this.psg.PeriodC;
                    }
                }
                this.psg.CountN -= nextevent;
                if (this.psg.CountN <= 0) {
                    if ((this.psg.RNG + 1) & 2) {
                        this.psg.OutputN = (~this.psg.OutputN & 0xff); // raz
                        outn = (this.psg.OutputN | this.psg.Regs[(7)]);
                    }
                    if (this.psg.RNG & 1) {
                        this.psg.RNG ^= 0x24000;
                    }
                    this.psg.RNG >>= 1;
                    this.psg.CountN += this.psg.PeriodN;
                }
                left -= nextevent;
            } while (left > 0);
            if (this.psg.Holding == 0) {
                this.psg.CountE -= 2;
                if (this.psg.CountE <= 0) {
                    do {
                        this.psg.CountEnv--;
                        this.psg.CountE += this.psg.PeriodE;
                    } while (this.psg.CountE <= 0);
                    if (this.psg.CountEnv < 0) {
                        if (this.psg.Hold) {
                            if (this.psg.Alternate)
                                this.psg.Attack ^= 0x1f;
                            this.psg.Holding = 1;
                            this.psg.CountEnv = 0;
                        } else {
                            if (this.psg.Alternate && (this.psg.CountEnv & 0x20))
                                this.psg.Attack ^= 0x1f;
                            this.psg.CountEnv &= 0x1f;
                        }
                    }
                    this.psg.VolE = this.psg.VolTable[this.psg.CountEnv ^ this.psg.Attack];
                    if (this.psg.EnvelopeA) this.psg.VolA = this.psg.VolE;
                    if (this.psg.EnvelopeB) this.psg.VolB = this.psg.VolE;
                    if (this.psg.EnvelopeC) this.psg.VolC = this.psg.VolE;
                }
            }
            vol = (vola * this.psg.VolA + volb * this.psg.VolB + volc * this.psg.VolC) / (3 * 2);
            if (--length & 1) {
                var val = vol / 0x0fff;
                stream[idx++] = val;
            }
        }
    }
    this.init = function(regs) {
        this.psg.Regs = regs;
        this.psg.RNG = 1;
        this.psg.OutputA = 0;
        this.psg.OutputB = 0;
        this.psg.OutputC = 0;
        this.psg.OutputN = 0xff;
        this.psg.ready = 0;
    }
    this.start = function() {
        var self = this;
        if (this.ctx == null && (window.AudioContext || window.webkitAudioContext)) {
            self.e8910_build_mixer_table();
            var ctx = window.AudioContext ?
                new window.AudioContext({sampleRate: 22050}) :
                new window.webkitAudioContext();
            this.ctx = ctx;
            this.node = this.ctx.createScriptProcessor(512, 0, 1);
            this.node.onaudioprocess = function(e) {
                self.e8910_callback(e.outputBuffer.getChannelData(0), 512);
            }
            this.node.connect(this.ctx.destination);
            var resumeFunc =
                function(){if (ctx.state !== 'running') ctx.resume();}
            document.documentElement.addEventListener("keydown", resumeFunc);
            document.documentElement.addEventListener("click", resumeFunc);
        }
        if (this.ctx) this.psg.ready = 1;
    }
    this.stop = function() {
        this.psg.ready = 0;
    }
}
//////////////////////////////////////////////////////////////////////////
function osint() {
    this.vecx = null;
    this.EMU_TIMER = 20;
    this.screen_x = 0;
    this.screen_y = 0;
    this.scl_factor = 0;
    this.color_set = new Array(Globals.VECTREX_COLORS);
    this.bytes_per_pixel = 4;
    this.osint_updatescale = function() {
        var sclx = Globals.ALG_MAX_X / this.screen_x >> 0;
        var scly = Globals.ALG_MAX_Y / this.screen_y >> 0;
        if( sclx > scly ) {
            this.scl_factor = sclx;
        } else {
            this.scl_factor = scly;
        }
    }
    this.osint_defaults = function() {
        this.osint_updatescale();
        return 0;
    }
    this.osint_gencolors = function() {
        for( var c = 0; c < Globals.VECTREX_COLORS; c++ ) {
            var rcomp = c * 256 / Globals.VECTREX_COLORS >> 0;
            var gcomp = c * 256 / Globals.VECTREX_COLORS >> 0;
            var bcomp = c * 256 / Globals.VECTREX_COLORS >> 0;
            this.color_set[c] = new Array(3);
            this.color_set[c][0] = rcomp;
            this.color_set[c][1] = gcomp;
            this.color_set[c][2] = bcomp;
        }
    }
    this.osint_pixelindex = function( x, y ) {
        return ( y * this.lPitch ) + ( x * this.bytes_per_pixel );
    }
    this.osint_clearscreen = function() {
        for( var x = 0; x < ( this.screen_y * this.lPitch ); x++ ) {
            if( ( x + 1 ) % 4 ) {
                this.imageData.data[x] = 0;
            }
        }
        this.ctx.putImageData(this.imageData, 0, 0);
    }
    this.osint_linep01 = function( x0, y0, x1, y1, color ) {
        var data = this.data;
        var color_set = this.color_set;
        var lPitch = this.lPitch;
        var bytes_per_pixel = this.bytes_per_pixel;
        var dx = ( x1 - x0 );
        var dy = ( y1 - y0 );
        var i0 = x0 / this.scl_factor >> 0;
        var i1 = x1 / this.scl_factor >> 0;
        var j = y0 / this.scl_factor >> 0;
        var e = dy * (this.scl_factor - (x0 % this.scl_factor)) -
            dx * (this.scl_factor - (y0 % this.scl_factor));
        dx *= this.scl_factor;
        dy *= this.scl_factor;
        var idx = this.osint_pixelindex(i0, j);
        for( ; i0 <= i1; i0++ ) {
            data[idx] = color_set[color][0];
            data[idx + 1] = color_set[color][1];
            data[idx + 2] = color_set[color][2];
            if( e >= 0 ) {
                idx += lPitch;
                e -= dx;
            }
            e += dy;
            idx += bytes_per_pixel;
        }
    }
    this.osint_linep1n = function( x0, y0, x1, y1, color ) {
        var data = this.data;
        var color_set = this.color_set;
        var lPitch = this.lPitch;
        var bytes_per_pixel = this.bytes_per_pixel;
        var dx = ( x1 - x0 );
        var dy = ( y1 - y0 );
        var i0 = y0 / this.scl_factor >> 0;
        var i1 = y1 / this.scl_factor >> 0;
        var j = x0 / this.scl_factor >> 0;
        var e = dx * (this.scl_factor - (y0 % this.scl_factor)) -
            dy * (this.scl_factor - (x0 % this.scl_factor));
        dx *= this.scl_factor;
        dy *= this.scl_factor;
        var idx = this.osint_pixelindex(j, i0);
        for( ; i0 <= i1; i0++ ) {
            data[idx] = color_set[color][0];
            data[idx + 1] = color_set[color][1];
            data[idx + 2] = color_set[color][2];
            if( e >= 0 ) {
                idx += bytes_per_pixel;
                e -= dy;
            }
            e += dx;
            idx += lPitch;
        }
    }
    this.osint_linen01 = function( x0, y0, x1, y1, color ) {
        var data = this.data;
        var color_set = this.color_set;
        var lPitch = this.lPitch;
        var bytes_per_pixel = this.bytes_per_pixel;
        var dx = ( x1 - x0 );
        var dy = ( y0 - y1 );
        var i0 = x0 / this.scl_factor >> 0;
        var i1 = x1 / this.scl_factor >> 0;
        var j = y0 / this.scl_factor >> 0;
        var e = dy * (this.scl_factor - (x0 % this.scl_factor)) -
            dx * (y0 % this.scl_factor);
        dx *= this.scl_factor;
        dy *= this.scl_factor;
        var idx = this.osint_pixelindex(i0, j);
        for( ; i0 <= i1; i0++ ) {
            data[idx] = color_set[color][0];
            data[idx + 1] = color_set[color][1];
            data[idx + 2] = color_set[color][2];
            if( e >= 0 ) {
                idx -= lPitch;
                e -= dx;
            }
            e += dy;
            idx += bytes_per_pixel;
        }
    }
    this.osint_linen1n = function( x0, y0, x1, y1, color ) {
        var data = this.data;
        var color_set = this.color_set;
        var lPitch = this.lPitch;
        var bytes_per_pixel = this.bytes_per_pixel;
        var dx = ( x0 - x1 );
        var dy = ( y1 - y0 );
        var i0 = y0 / this.scl_factor >> 0;
        var i1 = y1 / this.scl_factor >> 0;
        var j = x0 / this.scl_factor >> 0;
        var e = dx * (this.scl_factor - (y0 % this.scl_factor)) -
            dy * (x0 % this.scl_factor);
        dx *= this.scl_factor;
        dy *= this.scl_factor;
        var idx = this.osint_pixelindex(j, i0);
        for( ; i0 <= i1; i0++ ) {
            data[idx] = color_set[color][0];
            data[idx + 1] = color_set[color][1];
            data[idx + 2] = color_set[color][2];
            if( e >= 0 ) {
                idx -= bytes_per_pixel;
                e -= dy;
            }
            e += dx;
            idx += lPitch;
        }
    }
    this.osint_line = function( x0, y0, x1, y1, color ) {
        if( x1 > x0 ) {
            if( y1 > y0 ) {
                if( (x1 - x0) > (y1 - y0) ) {
                    this.osint_linep01(x0, y0, x1, y1, color);
                } else {
                    this.osint_linep1n(x0, y0, x1, y1, color);
                }
            } else {
                if( (x1 - x0) > (y0 - y1) ) {
                    this.osint_linen01(x0, y0, x1, y1, color);
                } else {
                    this.osint_linen1n(x1, y1, x0, y0, color);
                }
            }
        } else {
            if( y1 > y0 ) {
                if( (x0 - x1) > (y1 - y0) ) {
                    this.osint_linen01(x1, y1, x0, y0, color);
                } else {
                    this.osint_linen1n(x0, y0, x1, y1, color);
                }
            } else {
                if( (x0 - x1) > (y0 - y1) ) {
                    this.osint_linep01(x1, y1, x0, y0, color);
                } else {
                    this.osint_linep1n(x1, y1, x0, y0, color);
                }
            }
        }
    }
    this.osint_render = function() {
        var vector_erse_cnt = this.vecx.vector_erse_cnt;
        var vectors_erse = this.vecx.vectors_erse;
        var vector_draw_cnt = this.vecx.vector_draw_cnt;
        var vectors_draw = this.vecx.vectors_draw;
        var v = 0;
        var erse = null;
        var draw = null;
        var vectrexColors = Globals.VECTREX_COLORS;
        for( v = 0; v < vector_erse_cnt; v++ ) {
            erse = vectors_erse[v];
            if( erse.color != vectrexColors ) {
                this.osint_line(erse.x0, erse.y0, erse.x1, erse.y1, 0);
            }
        }
        for( v = 0; v < vector_draw_cnt; v++ ) {
            draw = vectors_draw[v];
            this.osint_line(draw.x0, draw.y0, draw.x1, draw.y1, draw.color);
        }
        this.ctx.putImageData(this.imageData, 0, 0);
    }
    this.init = function( vecx ) {
        this.vecx = vecx;
        this.screen_x = Globals.SCREEN_X_DEFAULT;
        this.screen_y = Globals.SCREEN_Y_DEFAULT;
        this.lPitch = this.bytes_per_pixel * this.screen_x;
        this.osint_defaults();
        this.canvas = vecscr;
        this.ctx = this.canvas.getContext('2d');
        this.imageData = this.ctx.getImageData(0, 0, this.screen_x, this.screen_y);
        this.data = this.imageData.data;
        for( var i = 3; i < this.imageData.data.length - 3; i += 4 ) {
            this.imageData.data[i] = 0xFF;
        }
        this.osint_gencolors();
        this.osint_clearscreen();
    }
}
//////////////////////////////////////////////////////////////////////////
function vector_t() {
    this.x0 = 0;
    this.y0 = 0;
    this.x1 = 0;
    this.y1 = 0;
    this.color = 0;
    this.reset = function() {
        this.x0 = this.y0 = this.x1 = this.y1 = this.color = 0;
    }
}
//////////////////////////////////////////////////////////////////////////
function VecX() {
    this.osint = new osint();
    this.e6809 = new e6809();
    this.e8910 = new e8910();
    this.rom = new Array(0x2000);
    utils.initArray(this.rom, 0);
    this.cart = new Array(0x8000);
    utils.initArray(this.cart, 0);
    this.ram = new Array(0x400);
    utils.initArray(this.ram, 0);
    this.snd_regs = new Array(16);
    this.e8910.init(this.snd_regs);
    this.snd_select = 0;
    this.via_ora = 0;
    this.via_orb = 0;
    this.via_ddra = 0;
    this.via_ddrb = 0;
    this.via_t1on = 0;
    this.via_t1int = 0;
    this.via_t1c = 0;
    this.via_t1ll = 0;
    this.via_t1lh = 0;
    this.via_t1pb7 = 0;
    this.via_t2on = 0;
    this.via_t2int = 0;
    this.via_t2c = 0;
    this.via_t2ll = 0;
    this.via_sr = 0;
    this.via_srb = 0;
    this.via_src = 0;
    this.via_srclk = 0;
    this.via_acr = 0;
    this.via_pcr = 0;
    this.via_ifr = 0;
    this.via_ier = 0;
    this.via_ca2 = 0;
    this.via_cb2h = 0;
    this.via_cb2s = 0;
    this.alg_rsh = 0;
    this.alg_xsh = 0;
    this.alg_ysh = 0;
    this.alg_zsh = 0;
    this.alg_jch0 = 0;
    this.alg_jch1 = 0;
    this.alg_jch2 = 0;
    this.alg_jch3 = 0;
    this.alg_jsh = 0;
    this.alg_compare = 0;
    this.alg_dx = 0;
    this.alg_dy = 0;
    this.alg_curr_x = 0;
    this.alg_curr_y = 0;
    this.alg_max_x = Globals.ALG_MAX_X >> 1;
    this.alg_max_y = Globals.ALG_MAX_Y >> 1;
    this.alg_vectoring = 0;
    this.alg_vector_x0 = 0;
    this.alg_vector_y0 = 0;
    this.alg_vector_x1 = 0;
    this.alg_vector_y1 = 0;
    this.alg_vector_dx = 0;
    this.alg_vector_dy = 0;
    this.alg_vector_color = 0;
    this.vector_draw_cnt = 0;
    this.vector_erse_cnt = 0;
    this.vectors_draw = new Array(Globals.VECTOR_CNT);
    this.vectors_erse = new Array(Globals.VECTOR_CNT);
    this.vector_hash = new Array(Globals.VECTOR_HASH);
    utils.initArray(this.vector_hash, 0);
    this.fcycles = 0;
    this.snd_update = function() {
        switch( this.via_orb & 0x18 ) {
            case 0x00:
                break;
            case 0x08:
                break;
            case 0x10:
                if( this.snd_select != 14 ) {
                    this.snd_regs[this.snd_select] = this.via_ora;
                    this.e8910.e8910_write(this.snd_select, this.via_ora);
                }
                break;
            case 0x18:
                if( (this.via_ora & 0xf0) == 0x00 ) {
                    this.snd_select = this.via_ora & 0x0f;
                }
                break;
        }
    }
    this.alg_update = function() {
        switch( this.via_orb & 0x06 ) {
            case 0x00:
                this.alg_jsh = this.alg_jch0;
                if( (this.via_orb & 0x01) == 0x00 ) {
                    this.alg_ysh = this.alg_xsh;
                }
                break;
            case 0x02:
                this.alg_jsh = this.alg_jch1;
                if( (this.via_orb & 0x01) == 0x00 ) {
                    this.alg_rsh = this.alg_xsh;
                }
                break;
            case 0x04:
                this.alg_jsh = this.alg_jch2;
                if( (this.via_orb & 0x01) == 0x00 ) {
                    if( this.alg_xsh > 0x80 ) {
                        this.alg_zsh = this.alg_xsh - 0x80;
                    } else {
                        this.alg_zsh = 0;
                    }
                }
                break;
            case 0x06:
                this.alg_jsh = this.alg_jch3;
                break;
        }
        if( this.alg_jsh > this.alg_xsh )
        {
            this.alg_compare = 0x20;
        }
        else
        {
            this.alg_compare = 0;
        }
        this.alg_dx = this.alg_xsh - this.alg_rsh;
        this.alg_dy = this.alg_rsh - this.alg_ysh;
    }
    this.read8 = function( address )
    {
        address &= 0xffff;
        if( (address & 0xe000) == 0xe000 )
        {
            return this.rom[address & 0x1fff] & 0xff;
        }
        if( (address & 0xe000) == 0xc000 )
        {
            if( address & 0x800 )
            {
                return this.ram[address & 0x3ff] & 0xff;
            }
            var data = 0;
            switch( address & 0xf )
            {
                case 0x0:
                    if( this.via_acr & 0x80 )
                    {
                        data = ((this.via_orb & 0x5f) | this.via_t1pb7 | this.alg_compare);
                    }
                    else
                    {
                        data = ((this.via_orb & 0xdf) | this.alg_compare);
                    }
                    return data & 0xff;
                case 0x1:
                    if( (this.via_pcr & 0x0e) == 0x08 )
                    {
                        this.via_ca2 = 0;
                    }
                case 0xf:
                    if( (this.via_orb & 0x18) == 0x08 )
                    {
                        data = this.snd_regs[this.snd_select];
                    }
                    else
                    {
                        data = this.via_ora;
                    }
                    return data & 0xff;
                case 0x2:
                    return this.via_ddrb & 0xff;
                case 0x3:
                    return this.via_ddra & 0xff;
                case 0x4:
                    data = this.via_t1c;
                    this.via_ifr &= 0xbf;
                    this.via_t1on = 0;
                    this.via_t1int = 0;
                    this.via_t1pb7 = 0x80;
                    if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                    {
                        this.via_ifr |= 0x80;
                    }
                    else
                    {
                        this.via_ifr &= 0x7f;
                    }
                    return data & 0xff;
                case 0x5:
                    return (this.via_t1c >> 8) & 0xff;
                case 0x6:
                    return this.via_t1ll & 0xff;
                case 0x7:
                    return this.via_t1lh & 0xff;
                case 0x8:
                    data = this.via_t2c;
                    this.via_ifr &= 0xdf;
                    this.via_t2on = 0;
                    this.via_t2int = 0;
                    if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                    {
                        this.via_ifr |= 0x80;
                    }
                    else
                    {
                        this.via_ifr &= 0x7f;
                    }
                    return data & 0xff;
                case 0x9:
                    return (this.via_t2c >> 8);
                case 0xa:
                    data = this.via_sr;
                    this.via_ifr &= 0xfb;
                    this.via_srb = 0;
                    this.via_srclk = 1;
                    if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                    {
                        this.via_ifr |= 0x80;
                    }
                    else
                    {
                        this.via_ifr &= 0x7f;
                    }
                    return data & 0xff;
                case 0xb:
                    return this.via_acr & 0xff;
                case 0xc:
                    return this.via_pcr & 0xff;
                case 0xd:
                    return this.via_ifr & 0xff;
                case 0xe:
                    return (this.via_ier | 0x80) & 0xff;
            }
        }
        if( address < 0x8000 )
        {
            return this.cart[address] & 0xff;
        }
        return 0xff;
    }
    this.write8 = function( address, data )
    {
        address &= 0xffff;
        data &= 0xff;
        if( (address & 0xe000) == 0xe000 )
        {
        }
        else if( (address & 0xe000) == 0xc000 )
        {
            if( address & 0x800 )
            {
                this.ram[address & 0x3ff] = data;
            }
            if( address & 0x1000 )
            {
                switch( address & 0xf )
                {
                    case 0x0:
                        this.via_orb = data;
                        this.snd_update();
                        this.alg_update();
                        if( (this.via_pcr & 0xe0) == 0x80 )
                        {
                            this.via_cb2h = 0;
                        }
                        break;
                    case 0x1:
                        if( (this.via_pcr & 0x0e) == 0x08 )
                        {
                            this.via_ca2 = 0;
                        }
                    case 0xf:
                        this.via_ora = data;
                        this.snd_update();
                        this.alg_xsh = data ^ 0x80;
                        this.alg_update();
                        break;
                    case 0x2:
                        this.via_ddrb = data;
                        break;
                    case 0x3:
                        this.via_ddra = data;
                        break;
                    case 0x4:
                        this.via_t1ll = data;
                        break;
                    case 0x5:
                        this.via_t1lh = data;
                        this.via_t1c = (this.via_t1lh << 8) | this.via_t1ll;
                        this.via_ifr &= 0xbf;
                        this.via_t1on = 1;
                        this.via_t1int = 1;
                        this.via_t1pb7 = 0;
                        if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                        {
                            this.via_ifr |= 0x80;
                        }
                        else
                        {
                            this.via_ifr &= 0x7f;
                        }
                        break;
                    case 0x6:
                        this.via_t1ll = data;
                        break;
                    case 0x7:
                        this.via_t1lh = data;
                        break;
                    case 0x8:
                        this.via_t2ll = data;
                        break;
                    case 0x9:
                        this.via_t2c = (data << 8) | this.via_t2ll;
                        this.via_ifr &= 0xdf;
                        this.via_t2on = 1;
                        this.via_t2int = 1;
                        if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                        {
                            this.via_ifr |= 0x80;
                        }
                        else
                        {
                            this.via_ifr &= 0x7f;
                        }
                        break;
                    case 0xa:
                        this.via_sr = data;
                        this.via_ifr &= 0xfb;
                        this.via_srb = 0;
                        this.via_srclk = 1;
                        if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                        {
                            this.via_ifr |= 0x80;
                        }
                        else
                        {
                            this.via_ifr &= 0x7f;
                        }
                        break;
                    case 0xb:
                        this.via_acr = data;
                        break;
                    case 0xc:
                        this.via_pcr = data;
                        if( (this.via_pcr & 0x0e) == 0x0c )
                        {
                            this.via_ca2 = 0;
                        }
                        else
                        {
                            this.via_ca2 = 1;
                        }
                        if( (this.via_pcr & 0xe0) == 0xc0 )
                        {
                            this.via_cb2h = 0;
                        }
                        else
                        {
                            this.via_cb2h = 1;
                        }
                        break;
                    case 0xd:
                        this.via_ifr &= (~(data & 0x7f));
                        if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                        {
                            this.via_ifr |= 0x80;
                        }
                        else
                        {
                            this.via_ifr &= 0x7f;
                        }
                        break;
                    case 0xe:
                        if( data & 0x80 )
                        {
                            this.via_ier |= data & 0x7f;
                        }
                        else
                        {
                            this.via_ier &= (~(data & 0x7f));
                        }
                        if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                        {
                            this.via_ifr |= 0x80;
                        }
                        else
                        {
                            this.via_ifr &= 0x7f;
                        }
                        break;
                }
            }
        }
        else if( address < 0x8000 )
        {
        }
    }
    this.vecx_reset = function()
    {
        for( var r = 0; r < this.ram.length; r++ )
        {
            this.ram[r] = r & 0xff;
        }
        for( var r = 0; r < 16; r++ )
        {
            this.snd_regs[r] = 0;
            this.e8910.e8910_write(r, 0);
        }
        this.snd_regs[14] = 0xff;
        this.e8910.e8910_write(14, 0xff);
        this.snd_select = 0;
        this.via_ora = 0;
        this.via_orb = 0;
        this.via_ddra = 0;
        this.via_ddrb = 0;
        this.via_t1on = 0;
        this.via_t1int = 0;
        this.via_t1c = 0;
        this.via_t1ll = 0;
        this.via_t1lh = 0;
        this.via_t1pb7 = 0x80;
        this.via_t2on = 0;
        this.via_t2int = 0;
        this.via_t2c = 0;
        this.via_t2ll = 0;
        this.via_sr = 0;
        this.via_srb = 8;
        this.via_src = 0;
        this.via_srclk = 0;
        this.via_acr = 0;
        this.via_pcr = 0;
        this.via_ifr = 0;
        this.via_ier = 0;
        this.via_ca2 = 1;
        this.via_cb2h = 1;
        this.via_cb2s = 0;
        this.alg_rsh = 128;
        this.alg_xsh = 128;
        this.alg_ysh = 128;
        this.alg_zsh = 0;
        this.alg_jch0 = 128;
        this.alg_jch1 = 128;
        this.alg_jch2 = 128;
        this.alg_jch3 = 128;
        this.alg_jsh = 128;
        this.alg_compare = 0;
        this.alg_dx = 0;
        this.alg_dy = 0;
        this.alg_curr_x = Globals.ALG_MAX_X >> 1;
        this.alg_curr_y = Globals.ALG_MAX_Y >> 1;
        this.alg_vectoring = 0;
        this.vector_draw_cnt = 0;
        this.vector_erse_cnt = 0;
        for( var i = 0; i < this.vectors_draw.length; i++ )
        {
            if( !this.vectors_draw[i] )
            {
                this.vectors_draw[i] = new vector_t();
            }
            else
            {
                this.vectors_draw[i].reset();
            }
        }
        for( var i = 0; i < this.vectors_erse.length; i++ )
        {
            if( !this.vectors_erse[i] )
            {
                this.vectors_erse[i] = new vector_t();
            }
            else
            {
                this.vectors_erse[i].reset();
            }
        }
        var len = Globals.romdata.length;
        for( var i = 0; i < len; i++ )
        {
            this.rom[i] = Globals.romdata.charCodeAt(i);
        }
        len = this.cart.length;
        for( var b = 0; b < len; b++ )
        {
            this.cart[b] = 0x01;
        }
        if( Globals.cartdata != null )
        {
            len = Globals.cartdata.length;
            for( var i = 0; i < len; i++ )
            {
                this.cart[i] = Globals.cartdata.charCodeAt(i);
            }
        }
        this.fcycles = Globals.FCYCLES_INIT;
        this.e6809.e6809_reset();
    }
    this.t2shift = 0;
    this.alg_addline = function( x0, y0, x1, y1, color )
    {
        var key = 0;
        var index = 0;
        var curVec = null;
        key = x0;
        key = key * 31 + y0;
        key = key * 31 + x1;
        key = key * 31 + y1;
        key %= Globals.VECTOR_HASH;
        curVec = null;
        index = this.vector_hash[key];
        if( index >= 0 && index < this.vector_draw_cnt )
        {
            curVec = this.vectors_draw[index];
        }
        if( curVec != null &&
            x0 == curVec.x0 && y0 == curVec.y0 &&
            x1 == curVec.x1 && y1 == curVec.y1 )
        {
            curVec.color = color;
        }
        else
        {
            curVec = null;
            if( index >= 0 && index < this.vector_erse_cnt )
            {
                curVec = this.vectors_erse[index];
            }
            if( curVec != null &&
                x0 == curVec.x0 && y0 == curVec.y0 &&
                x1 == curVec.x1 && y1 == curVec.y1 )
            {
                this.vectors_erse[index].color = Globals.VECTREX_COLORS;
            }
            curVec = this.vectors_draw[this.vector_draw_cnt];
            curVec.x0 = x0; curVec.y0 = y0;
            curVec.x1 = x1; curVec.y1 = y1;
            curVec.color = color;
            this.vector_hash[key] = this.vector_draw_cnt;
            this.vector_draw_cnt++;
        }
    }
    this.vecx_emu = function( cycles, ahead )
    {
        var icycles = 0;
        var c = 0;
        var tmp = null;
        var e6809 = this.e6809;
        var osint = this.osint;
        var fcycles_add = Globals.FCYCLES_INIT;
        var sig_dx = 0;
        var sig_dy = 0;
        var sig_ramp = 0;
        var sig_blank = 0;
        while( cycles > 0 )
        {
            icycles = e6809.e6809_sstep(this.via_ifr & 0x80, 0);
            for( c = 0; c < icycles; c++ )
            {
                this.t2shift = 0;
                if( this.via_t1on )
                {
                    this.via_t1c = ( this.via_t1c > 0 ? this.via_t1c - 1 : 0xffff );
                    if( (this.via_t1c & 0xffff) == 0xffff )
                    {
                        if( this.via_acr & 0x40 )
                        {
                            this.via_ifr |= 0x40;
                            if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                            {
                                this.via_ifr |= 0x80;
                            }
                            else
                            {
                                this.via_ifr &= 0x7f;
                            }
                            this.via_t1pb7 = 0x80 - this.via_t1pb7;
                            this.via_t1c = (this.via_t1lh << 8) | this.via_t1ll;
                        }
                        else
                        {
                            if( this.via_t1int )
                            {
                                this.via_ifr |= 0x40;
                                if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                                {
                                    this.via_ifr |= 0x80;
                                }
                                else
                                {
                                    this.via_ifr &= 0x7f;
                                }
                                this.via_t1pb7 = 0x80;
                                this.via_t1int = 0;
                            }
                        }
                    }
                }
                if( this.via_t2on && (this.via_acr & 0x20) == 0x00 )
                {
                    this.via_t2c = ( this.via_t2c > 0 ? this.via_t2c - 1 : 0xffff );
                    if( (this.via_t2c & 0xffff) == 0xffff )
                    {
                        if( this.via_t2int )
                        {
                            this.via_ifr |= 0x20;
                            if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                            {
                                this.via_ifr |= 0x80;
                            }
                            else
                            {
                                this.via_ifr &= 0x7f;
                            }
                            this.via_t2int = 0;
                        }
                    }
                }
                this.via_src = ( this.via_src > 0 ? this.via_src - 1 : 0xff );
                if( (this.via_src & 0xff) == 0xff )
                {
                    this.via_src = this.via_t2ll;
                    if( this.via_srclk )
                    {
                        this.t2shift = 1;
                        this.via_srclk = 0;
                    }
                    else
                    {
                        this.t2shift = 0;
                        this.via_srclk = 1;
                    }
                }
                else
                {
                    this.t2shift = 0;
                }
                if( this.via_srb < 8 )
                {
                    switch( this.via_acr & 0x1c )
                    {
                        case 0x00:
                            break;
                        case 0x04:
                            if( this.t2shift )
                            {
                                this.via_sr <<= 1;
                                this.via_srb++;
                            }
                            break;
                        case 0x08:
                            this.via_sr <<= 1;
                            this.via_srb++;
                            break;
                        case 0x0c:
                            break;
                        case 0x10:
                            if( this.t2shift )
                            {
                                this.via_cb2s = (this.via_sr >> 7) & 1;
                                this.via_sr <<= 1;
                                this.via_sr |= this.via_cb2s;
                            }
                            break;
                        case 0x14:
                            if( this.t2shift )
                            {
                                this.via_cb2s = (this.via_sr >> 7) & 1;
                                this.via_sr <<= 1;
                                this.via_sr |= this.via_cb2s;
                                this.via_srb++;
                            }
                            break;
                        case 0x18:
                            this.via_cb2s = (this.via_sr >> 7) & 1;
                            this.via_sr <<= 1;
                            this.via_sr |= this.via_cb2s;
                            this.via_srb++;
                            break;
                        case 0x1c:
                            break;
                    }
                    if( this.via_srb == 8 )
                    {
                        this.via_ifr |= 0x04;
                        if( (this.via_ifr & 0x7f) & (this.via_ier & 0x7f) )
                        {
                            this.via_ifr |= 0x80;
                        }
                        else
                        {
                            this.via_ifr &= 0x7f;
                        }
                    }
                }
                sig_dx = 0;
                sig_dy = 0;
                sig_ramp = 0;
                sig_blank = 0;
                if( (this.via_acr & 0x10) == 0x10 )
                {
                    sig_blank = this.via_cb2s;
                }
                else
                {
                    sig_blank = this.via_cb2h;
                }
                if( this.via_ca2 == 0 )
                {
                    sig_dx = this.alg_max_x - this.alg_curr_x;
                    sig_dy = this.alg_max_y - this.alg_curr_y;
                }
                else
                {
                    if( this.via_acr & 0x80 )
                    {
                        sig_ramp = this.via_t1pb7;
                    }
                    else
                    {
                        sig_ramp = this.via_orb & 0x80;
                    }
                    if( sig_ramp == 0 )
                    {
                        sig_dx = this.alg_dx;
                        sig_dy = this.alg_dy;
                    }
                    else
                    {
                        sig_dx = 0;
                        sig_dy = 0;
                    }
                }
                if( this.alg_vectoring == 0 )
                {
                    if( sig_blank == 1 &&
                        this.alg_curr_x >= 0 && this.alg_curr_x < Globals.ALG_MAX_X &&
                        this.alg_curr_y >= 0 && this.alg_curr_y < Globals.ALG_MAX_Y )
                    {
                        this.alg_vectoring = 1;
                        this.alg_vector_x0 = this.alg_curr_x;
                        this.alg_vector_y0 = this.alg_curr_y;
                        this.alg_vector_x1 = this.alg_curr_x;
                        this.alg_vector_y1 = this.alg_curr_y;
                        this.alg_vector_dx = sig_dx;
                        this.alg_vector_dy = sig_dy;
                        this.alg_vector_color = this.alg_zsh & 0xff;
                    }
                }
                else
                {
                    if( sig_blank == 0 )
                    {
                        this.alg_vectoring = 0;
                        this.alg_addline(this.alg_vector_x0, this.alg_vector_y0,
                            this.alg_vector_x1, this.alg_vector_y1,
                            this.alg_vector_color);
                    }
                    else if( sig_dx != this.alg_vector_dx ||
                             sig_dy != this.alg_vector_dy ||
                             ( this.alg_zsh & 0xff ) != this.alg_vector_color )
                    {
                        this.alg_addline(this.alg_vector_x0, this.alg_vector_y0,
                            this.alg_vector_x1, this.alg_vector_y1,
                            this.alg_vector_color);
                        if( this.alg_curr_x >= 0 && this.alg_curr_x < Globals.ALG_MAX_X &&
                            this.alg_curr_y >= 0 && this.alg_curr_y < Globals.ALG_MAX_Y )
                        {
                            this.alg_vector_x0 = this.alg_curr_x;
                            this.alg_vector_y0 = this.alg_curr_y;
                            this.alg_vector_x1 = this.alg_curr_x;
                            this.alg_vector_y1 = this.alg_curr_y;
                            this.alg_vector_dx = sig_dx;
                            this.alg_vector_dy = sig_dy;
                            this.alg_vector_color = this.alg_zsh & 0xff;
                        }
                        else
                        {
                            this.alg_vectoring = 0;
                        }
                    }
                }
                this.alg_curr_x += sig_dx;
                this.alg_curr_y += sig_dy;
                if( this.alg_vectoring == 1 &&
                    this.alg_curr_x >= 0 && this.alg_curr_x < Globals.ALG_MAX_X &&
                    this.alg_curr_y >= 0 && this.alg_curr_y < Globals.ALG_MAX_Y )
                {
                    this.alg_vector_x1 = this.alg_curr_x;
                    this.alg_vector_y1 = this.alg_curr_y;
                }
                if( (this.via_pcr & 0x0e) == 0x0a )
                {
                    this.via_ca2 = 1;
                }
                if( (this.via_pcr & 0xe0) == 0xa0 )
                {
                    this.via_cb2h = 1;
                }
            }
            cycles -= icycles;
            this.fcycles -= icycles;
            if( this.fcycles < 0 )
            {
                this.fcycles += fcycles_add;
                osint.osint_render();
                this.vector_erse_cnt = this.vector_draw_cnt;
                this.vector_draw_cnt = 0;
                tmp = this.vectors_erse;
                this.vectors_erse = this.vectors_draw;
                this.vectors_draw = tmp;
            }
        }
    }
    this.count = 0;
    this.startTime = null;
    this.nextFrameTime = null;
    this.extraTime = 0;
    this.fpsTimer = null;
    this.running = false;
    this.vecx_emuloop = function()
    {
        if( this.running ) return;
        this.running = true;
        var EMU_TIMER = this.osint.EMU_TIMER;
        var cycles = ( Globals.VECTREX_MHZ / 1000 >> 0 ) * EMU_TIMER;
        var vecx = this;
        this.startTime = this.nextFrameTime = new Date().getTime() + EMU_TIMER;
        this.count = 0;
        this.extraTime = 0;
        this.fpsTimer = setInterval(
            function()
            {
                stat.innerText = "FPS: " +
                    ( vecx.count / ( new Date().getTime() - vecx.startTime )
                        * 1000.0 ).toFixed(2) + " (50)" +
                    ( vecx.extraTime > 0 ?
                       ( ", extra: " +
                            ( vecx.extraTime / ( vecx.count / 50 ) ).toFixed(2)
                                + " (ms)" ) : "" );
                if( vecx.count > 500 )
                {
                    vecx.startTime = new Date().getTime();
                    vecx.count = 0;
                    vecx.extraTime = 0;
                }
            }, 2000
        );
        var f = function()
        {
            if( !vecx.running ) return;
            vecx.alg_jch0 =
                 ( vecx.leftHeld ? 0x00 :
                     ( vecx.rightHeld ? 0xff :
                        0x80 ) );
            vecx.alg_jch1 =
                 ( vecx.downHeld ? 0x00 :
                    ( vecx.upHeld ? 0xff :
                        0x80 ) );
            vecx.snd_regs[14] = vecx.shadow_snd_regs14;
            vecx.vecx_emu.call( vecx, cycles, 0 );
            vecx.count++;
            var now = new Date().getTime();
            var waitTime = vecx.nextFrameTime - now;
            vecx.extraTime += waitTime;
            if( waitTime < -EMU_TIMER ) waitTime = -EMU_TIMER;
            vecx.nextFrameTime = now + EMU_TIMER + waitTime;
            setTimeout( function() { f(); }, waitTime );
        };
        setTimeout( f, 15 );
    }
    this.stop = function()
    {
        if( this.running )
        {
            if( this.fpsTimer != null )
            {
                clearInterval( this.fpsTimer );
                this.fpsTimer = null;
            }
            this.running = false;
            this.e8910.stop();
        }
    }
    this.start = function()
    {
        if( !this.running )
        {
            this.e8910.start();
            this.vecx_emuloop();
        }
    }
    this.main = function()
    {
        this.osint.init( this );
        this.e6809.init( this );
        stat.innerText = "Loaded.";
        this.vecx_reset();
        this.start();
    }
    this.reset = function()
    {
        this.stop();
        this.vecx_reset();
        this.osint.osint_clearscreen();
        var vecx = this;
        setTimeout( function() { vecx.start(); }, 200 );
    }
    this.toggleSoundEnabled = function()
    {
        return this.e8910.toggleEnabled();
    }
    this.leftHeld = false;
    this.rightHeld = false;
    this.upHeld = false;
    this.downHeld = false;
    this.shadow_snd_regs14 = 0xff;
    this.onkeydown = function( event )
    {
        var handled = true;
        switch( event.keyCode )
        {
            case 37:
            case 76:
                this.leftHeld = true;
                break;
            case 38:
            case 80:
                this.upHeld = true;
                break;
            case 39:
            case 222:
                this.rightHeld = true;
                break;
            case 40:
            case 59:
            case 186:
                this.downHeld = true;
                break;
            case 65:
                this.shadow_snd_regs14 &= (~0x01);
                break;
            case 83:
                this.shadow_snd_regs14 &= (~0x02);
                break;
            case 68:
                this.shadow_snd_regs14 &= (~0x04);
                break;
            case 70:
                this.shadow_snd_regs14 &= (~0x08);
                break;
            default:
                handled = false;
        }
        if( handled && event.preventDefault )
        {
            event.preventDefault();
        }
    }
    this.onkeyup = function( event )
    {
        var handled = true;
        switch( event.keyCode )
        {
            case 37:
            case 76:
                this.leftHeld = false;
                break;
            case 38:
            case 80:
                this.upHeld = false;
                break;
            case 39:
            case 222:
                this.rightHeld = false;
                break;
            case 40:
            case 59:
            case 186:
                this.downHeld = false;
                break;
            case 65:
                this.shadow_snd_regs14 |= 0x01;
                break;
            case 83:
                this.shadow_snd_regs14 |= 0x02;
                break;
            case 68:
                this.shadow_snd_regs14 |= 0x04;
                break;
            case 70:
                this.shadow_snd_regs14 |= 0x08;
                break;
            default:
                handled = false;
        }
        if( handled && event.preventDefault )
        {
            event.preventDefault();
        }
    }
}
//////////////////////////////////////////////////////////////////////////
Globals.romdata=atob('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');

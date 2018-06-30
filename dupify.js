/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
use context in this project: Serializing functions
*/

'use strict';

// Generate an internal UID to make the regexp pattern harder to guess.
var UID                 = Math.floor(Math.random() * 0x10000000000).toString(16);
var PLACE_HOLDER_REGEXP = new RegExp('"@__(F|R|D)-' + UID + '-(\\d+)__@"', 'g');

var IS_NATIVE_CODE_REGEXP = /\{\s*\[native code\]\s*\}/g;
var UNSAFE_CHARS_REGEXP   = /[<>\/\u2028\u2029]/g;

// Mapping of unsafe HTML and invalid JavaScript line terminator chars to their
// Unicode char counterparts which are safe to use in JavaScript strings.
var ESCAPED_CHARS = {
    '<'     : '\\u003C',
    '>'     : '\\u003E',
    '/'     : '\\u002F',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
};

function escapeUnsafeChars(unsafeChar) {
    return ESCAPED_CHARS[unsafeChar];
}

//module.exports = function serialize(obj, options) {
var serialize=function (obj, options) {
    options || (options = {});

    // Backwards-compatibility for `space` as the second argument.
    if (typeof options === 'number' || typeof options === 'string') {
        options = {space: options};
    }

    var functions = [];
    var regexps   = [];
    var dates     = [];

    // Returns placeholders for functions and regexps (identified by index)
    // which are later replaced by their string representation.
    function replacer(key, value) {
        if (!value) {
            return value;
        }

        // If the value is an object w/ a toJSON method, toJSON is called before
        // the replacer runs, so we use this[key] to get the non-toJSONed value.
        var origValue = this[key];
        var type = typeof origValue;

        if (type === 'object') {
            if(origValue instanceof RegExp) {
                return '@__R-' + UID + '-' + (regexps.push(origValue) - 1) + '__@';
            }

            if(origValue instanceof Date) {
                return '@__D-' + UID + '-' + (dates.push(origValue) - 1) + '__@';
            }
        }

        if (type === 'function') {
            return '@__F-' + UID + '-' + (functions.push(origValue) - 1) + '__@';
        }

        return value;
    }

    var str;

    // Creates a JSON string representation of the value.
    // NOTE: Node 0.12 goes into slow mode with extra JSON.stringify() args.
    if (options.isJSON && !options.space) {
        str = JSON.stringify(obj);
    } else {
        str = JSON.stringify(obj, options.isJSON ? null : replacer, options.space);
    }

    // Protects against `JSON.stringify()` returning `undefined`, by serializing
    // to the literal string: "undefined".
    if (typeof str !== 'string') {
        return String(str);
    }

    // Replace unsafe HTML and invalid JavaScript line terminator chars with
    // their safe Unicode char counterpart. This _must_ happen before the
    // regexps and functions are serialized and added back to the string.
    if (options.unsafe !== true) {
        str = str.replace(UNSAFE_CHARS_REGEXP, escapeUnsafeChars);
    }

    if (functions.length === 0 && regexps.length === 0 && dates.length === 0) {
        return str;
    }

    // Replaces all occurrences of function, regexp and date placeholders in the
    // JSON string with their string representations. If the original value can
    // not be found, then `undefined` is used.
    return str.replace(PLACE_HOLDER_REGEXP, function (match, type, valueIndex) {
        if (type === 'D') {
            return "new Date(\"" + dates[valueIndex].toISOString() + "\")";
        }

        if (type === 'R') {
            return regexps[valueIndex].toString();
        }

        var fn           = functions[valueIndex];
        var serializedFn = fn.toString();

        if (IS_NATIVE_CODE_REGEXP.test(serializedFn)) {
            throw new TypeError('Serializing native function: ' + fn.name);
        }

        return serializedFn;
    });
}
/**
 * ES6 Map like object. Author:Azu
 * https://github.com/azu/map-like/blob/master/src/MapLike.js
 * See [Map - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map "Map - JavaScript | MDN")
 * Here, Only used as a fall back for packer. Does not polyfill Map functionality
 */
// LICENSE : MIT
"use strict";
// constants
const NanSymbolMark = {};

function encodeKey(key) {
    const isNotNumber = typeof key === "number" && key !== key;
    return isNotNumber ? NanSymbolMark : key;
}

function decodeKey(encodedKey) {
    return (encodedKey === NanSymbolMark) ? NaN : encodedKey;
}
class MapLike {
    constructor(entries = []) {
        this._keys = [];
 
        this._values = [];
 
        entries.forEach(entry => {
            if (!Array.isArray(entry)) {
                throw new Error("should be `new MapLike([ [key, value] ])`");
            }
            if (entry.length !== 2) {
                throw new Error("should be `new MapLike([ [key, value] ])`");
            }
            this.set(entry[0], entry[1]);
        });
    }

    get size() {
        return this._values.filter(value => value !== undefined).length;
    }

    entries() {
        return this.keys().map(key => {
            var value = this.get(key);
            return [decodeKey(key), value];
        });
    }

    keys() {
        return this._keys.filter(value => value !== undefined).map(decodeKey);
    }

    values() {
        return this._values.slice();
    }

    get(key) {
        const idx = this._keys.indexOf(encodeKey(key));
        return (idx !== -1) ? this._values[idx] : undefined;
    }


    has(key) {
        return (this._keys.indexOf(encodeKey(key)) !== -1);
    }

    set(key, value) {
        const idx = this._keys.indexOf(encodeKey(key));
        if (idx !== -1) {
            this._values[idx] = value;
        } else {
            this._keys.push(encodeKey(key));
            this._values.push(value);
        }
        return this;
    }

    delete(key) {
        const idx = this._keys.indexOf(encodeKey(key));
        if (idx === -1) {
            return false;
        }
        this._keys.splice(idx, 1);
        this._values.splice(idx, 1);
        return true;
    }

    clear() {
        this._keys = [];
        this._values = [];
        return this;
    }

    forEach(handler, thisArg) {
        this.keys().forEach(key => {
            // value, key, map
            handler(this.get(key), key, thisArg || this);
        });
    }
}
var pMap= Map||MapLike
/*
copyright 2018 Conley Johnson
license MIT
/*
objects are laid out in a registry (objects only.)
object[pieces] refers to objects, not primitives
  and remember, object pieces still preserve their properties, but those properties are replaced with missiles
*/
var arrayWrap=function(thing){
	  if(Object.prototype.toString.call(thing)!=='[object Array]'){
		  return [thing]
	  }else{return thing} 
	}

	var waterMarks={
  __$_VAL:1,
  __$_TYPE:1,
  __$_LEN:1,
  __$_ORIGLEN:1,
  __$_buffer:1,
  __$_byteOffset:1,
	_HS:1,
	_M:1,
  }
  function cleanClone(p={}){
    var{clone,leaveHSandM=false}=p
    for(let k in waterMarks){
  	  if(leaveHSandM && (k==='_HS' ||k==='_M')){continue;}
  	  if(clone!==undefined && clone.hasOwnProperty(k)){delete clone[k]}
  	}
  }
	var getOwn=function(to,from){
	  for (let a in from){
		  try{to[a]=from[a]}catch(e){}
		}
	}
export function Dupify(){
  this.filters=new pMap()
	
  this.makeMissiles=function(p={}){
	  //objects are normalized now in objPieces, and reverse noremalized in the registry. crosslink missiles
		var {registry,objPieces}=p
    for(var a in objPieces){
		  var piece=objPieces[a]
		  for(var k in piece){
			  if(registry.has(piece[k])){
				  piece[k]={_M:registry.get(piece[k])}//registry returns the counter ID for that object
				}
			} 
		}		
	}
	this.clone=function(p={}){
	  return this.deepClone(p.obj,p)
	}
	this.pack=function(p={}){//takes obj, stopProp
		p.JSONReady=true
	  var normal=this.deepClone(p.obj,p)//    clone
		var{registry,objPieces}=normal
	  this.makeMissiles(normal)
		return JSON.stringify(objPieces)		
	}

	///////////////unpack
	this.removeHeatSources=function(p={}){
	  var{objPieces}=p
		for(var k in objPieces){if(objPieces[k]._HS!==undefined){delete objPieces[k]._HS}}
	}
	this.cleanPieces=function(p={}){
	  var{objPieces}=p
		for(var k in objPieces){
			cleanClone({clone:objPieces[k]})}
	}
	this.layoutPieces=function(p={}){
	  var{obj}=p
	  var objPieces=JSON.parse(obj)//objpieces props should correspond to heatsources
		var registry= new pMap()
		for(var k in objPieces){registry.set(objPieces[k],objPieces[k]._HS)}
		return {registry,objPieces}
	}
	this.recastObjectTypes=function(p={}){
	  var {objPieces}=p
		//preloop to reconstruct buffers first. they must be constructed at the time of the recreation of their views
    for(let a in objPieces){
  		var piece=objPieces[a]//storage
  		if(piece.__$_TYPE!=='ArrayBuffer'){continue;}
  		var recast=determineConversionSpace(piece.__$_TYPE)
  		objPieces[a]=recast.in({obj:piece,objPieces})
			getOwn(objPieces[a],piece)//reassign the enumerables if any
//			if(useRevival){objPieces[a]=useRevival(objPieces[a])}
//			objPieces[a]._HS=piece._HS
			objPieces[a].__$_TYPE='ArrayBuffer'//may have to switch to instance of checks in the future. 
		}
    for(let a in objPieces){
  		var piece=objPieces[a]//storage
  		if(piece.__$_TYPE==='ArrayBuffer'){continue;}
  		var recast=determineConversionSpace(piece.__$_TYPE)
  		objPieces[a]=recast.in({obj:piece,objPieces})
			getOwn(objPieces[a],piece)//reassign the enumerables if any
//			objPieces[a]._HS=piece._HS
		}
		//one final loop to give revival a chance at the finished product
	}
	var kernels=new pMap()
  kernels.set('__$_NaN','df'/4)
  kernels.set('__$_undefined',undefined)
  kernels.set('__$_Infinity',Infinity)
  kernels.set('__$_-Infinity',-Infinity)
	this.fixKernels=function(piece,k){
	  if(kernels.has(piece[k])){piece[k]=kernels.get(piece[k])}
	}
  this.putKernels=function(clone){
    if(Number.isNaN(clone)){return '__$_NaN'}
    if(clone===undefined){return '__$_undefined'}
    if(clone===Infinity){return '__$_Infinity'}
    if(clone===-Infinity){return '__$_-Infinity'}
  	return clone
	}

  this.deployMissiles=function(p={}){
	  var{registry,objPieces}=p
    for(var a in objPieces){
		  var piece=objPieces[a]
			
			if(piece.constructor &&piece.constructor===Map){
			  var additions=[]
  		  var tearDown=function(v,k){
				  piece.delete(k);
  				additions.push([
					  kernels.has(k)?kernels.get(k):objPieces[k._M]||k,
						kernels.has(v)?kernels.get(v):objPieces[v._M]||v
					])
				}
				var build=function(val){
				  piece.set(val[0],val[1])
				}
				piece.forEach(tearDown)
				additions.forEach(build)
			}
			 
			else if(piece.constructor &&piece.constructor===Set){
			  var additions=[]
  		  var tearDown=function(v){
				  piece.delete(v);
  				additions.push(kernels.has(v)?kernels.get(v):objPieces[v._M]||v)
				}
				var build=function(val){
				  piece.add(val)
				}
				piece.forEach(tearDown)
				additions.forEach(build)
			} 

		  for(var k in piece){
			  if(piece[k]&&piece[k]._M!==undefined){//checking a property on a null value kicks out an error
				  piece[k]=objPieces[piece[k]._M]//objPieces prop should corresont to heatsource
				}
			this.fixKernels(piece,k)
			}
		}		
	}
  this.applyRevival=function(p={}){
	  var {objPieces,revival,suppressRevival}=p
		var useRevival=suppressRevival?false:(revival||this.revival)
  	if(useRevival){			
      for(let a in objPieces){
    		//var piece=objPieces[a]//storage
  			objPieces[a]=useRevival(objPieces[a])
  		}
		}
	}
	
	
	this.unpack=function(p={}){		 
//    layout in memory, and populate a registry
    if(typeof p==='string'){p={obj:p}}
		var normal=this.layoutPieces(p)
		normal.revival=p.revival;normal.suppressRevival=p.suppressRevival
    var{registry,objPieces}=normal

  	this.recastObjectTypes(normal)//still flattened

		this.deployMissiles(normal)
    
//		this.removeHeatSources(normal)
		this.cleanPieces(normal)
		this.applyRevival(normal)

		var headObj=objPieces[0]//get it before clearing the registry
		registry.clear()
		return headObj
	}	
}
Dupify.serialize=function(p){return serialize(p)}
Dupify.prototype.serialize=Dupify.serialize

Dupify.prototype.transform=false
Dupify.prototype.setTransform=function(func){this.transform=func; return this}
Dupify.prototype.unsetTransform=function(){this.transform=false;return this}

Dupify.prototype.revival=false
Dupify.prototype.setRevival=function(func){this.revival=func;return this}
Dupify.prototype.unsetRevival=function(){this.revival=false;return this}
//Filter stuff

Dupify.prototype.addFilters=function(p={}){
  p=arrayWrap(p)
	var add=function(val){
		this.filters.set(val,1)
	}.bind(this)
	p.forEach(add)
  return this
}

Dupify.prototype.removeFilters=function(p={}){
  p=arrayWrap(p)
	var remove=function(val){
		if(this.filters.has(val)){
			this.filters.delete(val)
		}
	}.bind(this)
	p.forEach(remove)//looping through the array, not the Map. so it's ok
	return this
}

Dupify.prototype.clearFilters=function(){
  this.filters.clear()
	return this
}
Dupify.prototype.getFilters=function(){
  var store=[]
	var add=function(v,k){store.push(k)}
  this.filters.forEach(add)
	return store
}
var getPathParam=function(path,cont,key,value){
  return {
			  path,
				next:{
				  containingObj:cont,
					key,
					value
				}
			}
}
var testFilters=function(path,cont,key,value,useFilters){
  if(!useFilters){return true}
  var param=getPathParam(path,cont,key,value)
	return dFilter(param,useFilters)//filters returns boolean

}
var dFilter=function(p,filters=[]){
	for(let i=0,len=filters.length;i<len;i++){
		  if( filters[i](p)===false){return false}
	}
	return true
}
//end filter stuff
Dupify.prototype.deepClone=function(obj,p={}){//preserves circular references. Function references point to the original
    if(p.obj){obj=p.obj}
	  if(!obj ||!((obj!==null && typeof obj==='object') ||typeof obj==='function')){return obj}//null,undefined,
		
		var {
  		stopProp={},
			registry=new pMap(),
			cloneRegistry=new pMap(),
			JSONReady=false,
			objPieces={},
			transform=false,
			filters=false,
			duplicateFuncs=false,
			suppressTransform=false,
			suppressEnumerable=false,
			suppressFilters=false,
		}=p
		if(filters){filters=arrayWrap(filters)}
		var storedFilters=this.getFilters()
		var useTransform=suppressTransform?false:transform||this.transform
		var useFilters=suppressFilters?false:(filters||(storedFilters.length>0?storedFilters:false))

		var counter=0,copy=0
		var path=[]
		var fork=function(obj,key,containingObj){
      var type=typeof obj,clone
      if(obj!==null && type==='object' ||type==='function'){			  
        //have I seen you before?
        if(registry.has(obj)){clone=registry.get(obj)}
        //otherwise, create new clone address, and store in registry in association with this object
        else{
    			path.push({key,value:obj,containingObj})//they make their decision before forking, 

          var checkObj=useTransform?useTransform(obj):obj
					var useObj=checkObj===obj?obj:checkObj
					
          var cs=determineConversionSpace(useObj);
          clone=JSONReady?{}:cs.cast({obj:useObj,registry,cloneRegistry,objPieces,duplicateFuncs})
          
					registry.set(obj,clone)
					
					if(JSONReady){
					  clone._HS=counter
  					cloneRegistry.set(clone,counter);
						objPieces[counter]=clone;
						counter++
					}
          //clone.copy=copy++
					if(clone!==useObj){
            propagate(useObj,clone)
					}
          path.pop()
        }
			}
			else{//primitive If looking for a JSON, then the clone has to have the correct end ptoperties.
        clone=useTransform?useTransform(obj):obj
				if(JSONReady){
				  clone=this.putKernels(clone)
				}
			}//primitive
			return clone		
		}.bind(this)
		var propagate=function(obj,clone){//clone should be an empty object of the same type
		  var cs=determineConversionSpace(obj)
			var enumSpace=conversion['Object']
			
			var construct=cs.constructorType
			var constring=constructStrings.get(construct)
  		
			cs[JSONReady?'outJSON':'out']({obj,clone,fork,duplicateFuncs,path,useFilters})
			if(!suppressEnumerable){enumSpace[JSONReady?'outJSON':'out']({obj,clone,fork,duplicateFuncs,path,useFilters})}
			
		}.bind(this)
    var finalClone=fork(obj)
		return JSONReady?{registry:cloneRegistry,objPieces}:finalClone
	}
var constructors={
  'Object':Object,
  'Function':Function,

  'Error':Error,
  'EvalError':EvalError?EvalError:Error,
  'RangeError':RangeError?RangeError:Error,
  'ReferenceError':ReferenceError?ReferenceError:Error,
  'SyntaxError':SyntaxError?SyntaxError:Error,
  'TypeError':TypeError?TypeError:Error,
  'URIError':URIError?URIError:Error,
	
  'RegExp':RegExp?RegExp:null,
  
  'Array':Array,

  'ArrayBuffer':ArrayBuffer?ArrayBuffer:Array,
  'Int8Array':Int8Array?Int8Array:Array,
  'Uint8Array':Uint8Array?Uint8Array:Array,
  'Uint8ClampedArray':Uint8ClampedArray?Uint8ClampedArray:Array,
  'Int16Array':Int16Array?Int16Array:Array,
  'Uint16Array':Uint16Array?Uint16Array:Array,
  'Int32Array':Int32Array?Int32Array:Array,
  'Uint32Array':Uint32Array?Uint32Array:Array,
  'Float32Array':Float32Array?Float32Array:Array,
  'Float64Array':Float64Array?Float64Array:Array,
  'DataView':DataView?DataView:Array,
	
  //ArrayBuffer
	 
  'Map':Map?Map:Array,
  'Set':Set?Set:Array,
	'Date':Date,
}
// and now reverse
var constructStrings=new pMap()//get a constructor string by it's consturctor
for(let k in constructors){
  if(constructors[k]===null){continue;}
  constructStrings.set(constructors[k],k)
}
constructStrings.set(Array,'Array')
constructStrings.set(Error,'Error')
//make conversion template underlying all object conversions
var conversionTemplate={
  out:function(p={}){
	  var{obj,clone,fork,useFilters,path}=p
    for (var a in obj){
		  if(!testFilters(path,obj,a,obj[a],useFilters)){continue}
      clone[a]=fork(obj[a],a,obj)
    }
	},
  outJSON:function(p){
	  var{clone}=p
	  this.out(p)
    if(this.constructorType!==Object){clone.__$_TYPE=constructStrings.get(this.constructorType)}
	},
  cast:function(p={}){
	  var{obj}=p;
	  return new (obj.constructor||this.constructorType)()
	},
	in:function(p={}){var{obj}=p;return obj},//
	constructorType:Object,
} 

//now populate conversion table
var conversion={}
for( let k in constructors ) {
  conversion[k] = Object.assign (
	  {},
		conversionTemplate,
		{ constructorType :  constructors[k] },
		k.indexOf ( 'Error' ) > -1 ? {
		  cast:function(p={}){
			  var{obj:err}=p
				return Object.assign(new constructors[k](err.message ,err.fileName ,err.lineNumber ), { name:err.name ,  columnNumber:err.columnNumber , stack:err.stack , })
			},
			out:()=>{},
			outJSON : function(p={}){var{obj, clone,fork}=p; Object.assign(clone,{__$_TYPE:k , message:obj.message , name:obj.name , fileName:obj.fileName , lineNumber:obj.lineNumber , columnNumber:obj.columnNumber , stack:obj.stack , })},
		  in : function( p={} ){
			  var {obj}=p
			  var replacement = new constructors[k](obj.message,obj.fileName,obj.lineNumber);
				Object.assign(replacement,{columnNumber:obj.columnNumber , stack:obj.stack })
				return replacement
			}
		}:{},
		k.indexOf( 'Array' ) > -1 ||k==='DataView'? {//pretty much for typed arrays. 
  		cast:function(p={}){
			  var{obj:arr,registry}=p;				
				var useBuffer=registry.has(arr.buffer)?registry.get(arr.buffer):(()=>{var newBuffer=arr.buffer.slice();registry.set(arr.buffer,newBuffer);return newBuffer})()//hav I seen you before?
				return new constructors[k](useBuffer,arr.byteOffset,arr.length)
			},//for typed arrays. 
  		out:function(){},//cast recreates because buffers and length are fixed at time of creation
			outJSON:function(p={}){
			  var{obj:arr , clone , fork }=p
  		  Object.assign(clone,{ __$_TYPE:k,__$_LEN:arr.length,__$_byteOffset:arr.byteOffset,__$_buffer:fork(arr.buffer,'buffer',arr)})
  		},
  		in:function(p={}){
			  var{obj:objArr,objPieces}=p//the buffer will have been recast first
				return new this.constructorType(objPieces[objArr.__$_buffer._M],objArr.__$_byteOffset,objArr.__$_LEN)				
			},//for typed arrays
		  
		}:{}
	)
}
var determineConversionSpace=function(obj){
  if(!obj){obj='Object'}
	if(typeof obj==='string'){return conversion[obj]||conversionTemplate}
  if(obj.constructor){var cs=constructStrings.get(obj.constructor)}	
  return conversion[cs]||conversionTemplate
}
//modify
Object.assign(conversion,{
  'Object':Object.assign(conversion['Object'],{
		cast:function(){return {}}//for speed	  
	}),
  'Array':Object.assign(conversion['Array'],{// for speed
		cast:function(){return []},
    out:function(p={}){
  	  var{obj,clone,fork,useFilters,path}=p
      for (let a=0,len=obj.length;a<len;a++){
  		  if(!testFilters(path,obj,a,obj[a],useFilters)){clone[a]='[OMITTED]';continue}
        clone[a]=fork(obj[a],a,obj)
      }
  	},
    outJSON:function(p){
  	  var{obj:arr,clone}=p
  	  this.out(p)
      if(this.constructorType!==Object){clone.__$_TYPE=constructStrings.get(this.constructorType);clone.__$_LEN=arr.length}
  	},
		in:function(p={}){
		  var{obj:bluePrint}=p
			var returnArray=[]
			for(let a=0,len=bluePrint.__$_LEN;a<len;a++){
			  returnArray[a]=bluePrint[a]
			}
			return returnArray		
		}
	}),
	'ArrayBuffer':Object.assign(conversion['ArrayBuffer'],{
		cast:function(p={}){var{obj:arr}=p;return arr.slice()},
    outJSON:function(p={}) {
		  //determine if the buffer is a length of 2. if it's right, then just read from it into the string. if not, creat another buffer of the right size, read into it using an int8 view, and then read that into the string
		  var {obj,clone,fork}=p
			var string=''
			
			var origLength=obj.byteLength
			var even=origLength % 2===0
			if(!even){
  			var newLength=origLength+1
  			var adjustedBuffer=new ArrayBuffer(newLength)
        var readInView=new Uint8Array(adjustedBuffer)
        var readOutView=new Uint8Array(obj)
  			for(let i=0;i<readOutView.length;i++){
  			  readInView[i]=readOutView[i]
  			}
  			var view=new Uint16Array(adjustedBuffer)
			}
			else{var view=new Uint16Array(obj)}

			for(let i=0;i<view.length;i++){
			  string+=String.fromCharCode.call(null,view[i])
			}
			Object.assign(clone,{__$_ORIGLEN:origLength,byteLength:view.buffer.byteLength,__$_TYPE:'ArrayBuffer', __$_VAL:string})
    },
		out:function(){},
		in:function(p={}){
  	  var{obj:bluePrint}=p
			var buf=new ArrayBuffer(bluePrint.byteLength) 
			var str=bluePrint.__$_VAL
//
      var bufView = new Uint16Array(buf);
      for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
			var diff=buf.byteLength-bluePrint.__$_ORIGLEN
			var ret=diff===0?buf:buf.slice(0,buf.byteLength-1)
      return ret;
		}
	}),
	'Map':Object.assign(conversion['Map'],{
		out:function(p={}){
		  var{obj:map,clone,fork,useFilters,path}=p
  	  var build=function(v,k){	 				
  		  if(testFilters(path,map,k,v,useFilters)){
    			var vclone= fork(v,k,map)//propagation is done here
    			var kclone= fork(k,k,map)
          clone.set(kclone,vclone)//take results and populate new map
				}
  	  }
  		map.forEach(build)		
		},
		outJSON:function(p={}){
		  var{obj:map,clone,fork,useFilters,path}=p
  	  var counter=0
  	  var build=function(v,k){	 				
  		  if(testFilters(path,map,k,v,useFilters)){
    			var vclone= fork(v,k,map)//propagation is done here
    			var kclone= fork(k,k,map)
  				clone['_@-k'+counter]=kclone;
  				clone['_@-v'+counter]=vclone;
  				counter++
				}
  	  }
  		map.forEach(build)		
  		clone.__$_TYPE='Map';clone.__$_LEN=counter		
		},
		in:function(p={}){
		  var {obj:objMap}=p
		  var replacement=new Map()
			for(let i=0;i<objMap.__$_LEN;i++){
			  replacement.set(objMap['_@-k'+i],objMap['_@-v'+i])
				delete(objMap['_@-v'+i])			
				delete(objMap['_@-k'+i])			
			}
			return replacement		
		},
	}),
  'Set':Object.assign(conversion['Set'],{
		out:function(p={}){
		    var{obj:set,clone,fork,useFilters,path}=p
			  var build=function(v){
    		  if(testFilters(path,set,v,v,useFilters)){
  					var vclone= fork(v,v,set)//propagation is done here
  					clone.add(vclone)
					}
			  }
				set.forEach(build)		
		},
		outJSON:function(p={}){
		    var{obj:set,clone,fork,useFilters,path}=p
			  var counter=0
			  var build=function(v){	 				
    		  if(testFilters(path,set,v,v,useFilters)){
  					var vclone= fork(v,v,set)//propagation is done here
  					clone['_@-v'+counter++]=vclone
					}
			  }
				set.forEach(build)		
				clone.__$_TYPE='Set';clone.__$_LEN=counter
		},
		in:function(p={}){
		  var{obj:objSet}=p
		  var replacement=new Set()
			for(let i=0;i<objSet.__$_LEN;i++){
			  replacement.add(objSet['_@-v'+i])
				delete(objSet['_@-v'+i])			
			}
			return replacement		
		},
	}),
  'RegExp':Object.assign(conversion['RegExp'],{
	  cast:function(p={}){var{obj:reg,clone}=p;return new RegExp(reg)},
	  outJSON:function(p={}){
		  var{obj:reg,clone}=p
		  Object.assign(clone,{__$_VAL:reg.toString(),__$_TYPE:'RegExp'})
		},
		out:()=>{},
		in:function(p={}){
		  var{obj:objReg,clone}=p
		  var val=objReg.__$_VAL.split('/')
			val.shift()
			var flags=val[val.length-1]
			val.pop()
		  return new RegExp(val.join('/'),flags)
		}
	}),
  'Date':Object.assign(conversion['Date'],{
	  cast:function(p={}){var{obj:date}=p;return new Date(date.getTime())},
		out:()=>{},
	  outJSON:function(p={}){
        var {obj:date,clone}=p
  			Object.assign(clone,{__$_VAL:date.getTime(),__$_TYPE:'Date'})
		},
		in:function(p={}){
		  var {obj:objDate}=p
		  return new Date(objDate.__$_VAL)
		}
	}),	
  'Function':Object.assign(conversion['Function'],{
    cast:function(p={}){
		  var {obj:func,duplicateFuncs=false}=p
		  if(!duplicateFuncs){return func}
		  return eval('('+serialize(func)+')')
		},
		out:()=>{},//cast does it
    outJSON:function(p={}){
		  var{obj:func,clone,fork}=p
  	  Object.assign(clone,{__$_VAL:serialize(func),__$_TYPE:'Function'})			
  	},
  	in:function(p={}){
		  var {obj,fork}=p;
			var val=obj.__$_VAL ; delete obj.__$_VAL;delete obj.__$_TYPE;
			var ret=eval('('+val+')')
			return ret
		}//
  }),
})


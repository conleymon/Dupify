



# Dupify
**npm i deep-clone-and-serialize**

Dupify is a deep-cloning and/or serialization utility. It preserves circular references and faithfully recreates your object tree.  Supported types:

* Object
* Array
* Map
* Set
* all Errors 
* ArrayBuffer
* all TypedArrays
* DataView
* Date
* RegExp
* Infinity,  -Infinity
* undefined
* NaN
* Functions

Enumerable properties on all objects are included by default, but may be suppressed.

DataView and TypedArray buffer references are preserved, i.e., If two or more TypedArrays/DataViews point to the same ArrayBuffer and both are included in a clone request, the cloned TypedArrays/DataViews (serialized or not) will also point to the same corresponding ArrayBuffer clone. 

Symbols are ignored. 

**Usage**
	
	import {Dupify} from 'dupify'
	var dupify=new Dupify()

	var obj={object tree and stuff}
	var json=dupify.pack({obj})
	
	//and to unpack:
	dupify.unpack(json)
	
	Or
	var cloneInMemory=dupify.clone({obj})
	
In the above example, dupify.pack(paramPackage) returns a JSON of an object that has been disassembled and with it's pieces tagged for reassembly, so it must be unpacked with Dupify. 

### prototype Methods
**clone({obj, otherParams})**

	returns a cloned object tree
  
**pack({obj, otherParams})**

	returns a JSON serialized clone of the object tree
The full parameter list for clone() and pack():

	dupifyInstance.clone({//or pack 
		obj,				//the object to be cloned or serialized. Required.
		filters,			//filter or array of filter functions to use on that call. Overrides any registered filters on that instance, only for that call
		transform,			//transform function to use on that call. Overrides the transform stored on that instance, only for that call
		suppressTransform,	//suppresses any transforming on that call. Set truthy to activate
		suppressFilters,	//suppresses any filtration on that call. Set truthy to activate
		suppressEnumerable,	//suppresses enumerable property propagation on all objects having a constructor other than Object`
		duplicateFuncs		//if set to truthy, functions will be cloned rather than have their references incorporated into the new object tree, and closures and bindings may be lost
		
	})




**unpack(str || {obj:str, revival})**

	returns a recreated  clone of the object tree from a serialized string. 
**setTransform(func)**  (replacer)

	Chainable. Sets a default (for the instance on which it was called) transform function to use for all objects encountered on the tree. The function is provided with the object encountered and accepts the return as the transform. The transform is recursively propagated.
	Ex.
	dupifyInstance.setTransform((obj)=>{return obj.party?obj:undefined})
	//undefined will be appended to the clone in place of any object not having a truthy property 'party'
	A transform should return any object type supported by Dupify (listed above)
	 
**unsetTransform()**

	Chainable. Removes the default transform function from the instance. 

**setRevival(func)**  (reviver)

	Chainable. Sets a default (for the instance on which it was called) revival function to rebuild an object that was transformed during a previous serialization.
	 
**unsetRevival()**

	Chainable. Removes the default revival function from the instance. 

**addFilters(filterFunc || array of filterFuncs)**

	Chainable. Adds a function to the registry of functions to be used to decide whether to propagate through a property. 
	Filter functions are provided a parameter object populated with the information about the path to the current location in the tree as well as about object whose entry is imminent. The param object takes the form:

	{
		next:{					// Hey, I want to add this next object. should I?
			key,				//pointer to the next object 
			value,				//the next object
			containingObj:	//the object containing the above key which points to the above value
		}
		path:[					//the node path taken through the tree to get to this point
			{key,value},		//first node value and the key that pointed to it
			{key,value},		//second node value and the key that pointed to it
			etc.
		]
	}

It follows that in the following example,

	dupifyInstance.addFilters(
		(p)=>{do stuff}
	)
 when the filter is called, p.path[p.path.length-1].value===p.next.containingObj, and   p.path[p.path.length-1].key was the pointer to it. p.next.value is the next object to be propagated through, and argument.next.key is the pointer to it.

Map keys are used in the path chain, not the numerical index of the Map pair.  For Sets, the value at the Set index content is used for both the key and value in the path chain - again, not the numerical index.

Filter functions must return false in order to stop propagation.

Ex. 1

	var dupify=new Dupify()
	var testObj={
		fruits:{
			mango:{
				eaten:true
			},
			cherry:{
				eaten:false
			}
		}
	}
	var stopMangos=function(p){
	  if(p.next.key==='mango'){return false}
	}	
	dupify.addFilters(stopMangos).clone(testObj)
	//output 
	{
		fruits:{
			cherry:{eaten:false}
		}
	}
 Ex. 2

	var dupify=new Dupify()
	var testObj={
		fruits:{
			mango:{
				eaten:true
			},
			cherry:{
				eaten:false
			}
		}
	}
	var stopLevels=function(p){
	  if(p.path.length>=2){return false}
	}	
	var clone=dupify.addFilters(stopLevels).clone(testObj)
	//output 
	{
		fruits:{}
	}
	//cherry and mango are both deeper than the second level

Where an Array index  is filtered out, the index is populated with a string '[OMITTED'] to keep the place in the stack.

**removeFilters(filterFunc || array of filterFuncs)**

	Removes submitted filter functions from the registry on the instance.


### Cloned functions
Dupify's default is to keep original references to any functions encountered during propagation. This way, in memory, functions retain their closures and  bindings and binding behavior. 

However, when cloning in memory, and cloned copies of encountered functions are desired, include a param 'duplicateFuncs:true' on the param object submitted to the clone() method.   The functions will work as though they had been serialized.

If the cloned tree retains original references, the child properties of those functions will not be propagated through.

### Serialized Functions
Arrow functions are converted to standard functions, and  closures and forced bindings are lost, though calls using the . operator should work fine. Use with care.  

### Degradation
Use polyfills. (Please.) It's an easier, better solution.

### Notes

There are no dependencies for Dupify. However, under the hood, Dupify uses serialize-javascript to serialize functions. https://www.npmjs.com/package/serialize-javascript
the full serialize-javascript functionality is made available through Dupify instances:

	var serialized=dupifyInstance.serialize(value)



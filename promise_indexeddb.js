class Connection {
	constructor(db, transaction, store) {
		this.db = db 
		this.transaction = transaction 
		this.store = store 
	}
	clean(callback = () => {}) { 
		this.transaction.oncomplete = () => {
			callback()
			this.db.close()
		}
	}
}

class PromiseIndexedDB {
	constructor(db_name, version = 1) {
		this.db_name = db_name 
		this.version = version
	}

	connect(store_name, mode = 'readonly') {
		return new Promise((resolve, reject) => {
			let request = indexedDB.open(this.db_name, this.version)

			request.onupgradeneeded = () => {
				let db = request.result
				db.createObjectStore(store_name, {keyPath: 'id', autoIncrement: 'true'})
				db.close()
			}

			request.onsuccess = () => {
				let db = request.result 
				if(!db.objectStoreNames.contains(store_name)) {
					db.close()
					return Promise.reject(`Store ${store_name} not existed`) 
				}

				let transaction = db.transaction(store_name, mode)
				let store = transaction.objectStore(store_name)
				resolve(new Connection(db, transaction, store))
			}

			request.onerror = () => reject()
		})
	} 

	async read_data(store_name) { 
		let connection = await this.connect(store_name)

		let data_list = []
		return new Promise((resolve, reject) => {
			connection.store.openCursor().onsuccess = (event) => {
				let cursor = event.target.result
				if (cursor) {
					let value = cursor.value
					data_list.push(value)	
					cursor.continue()
				}
			};

			connection.clean(() =>  resolve(data_list) )
		})
	}

	async update_data(data_list, store_name) { 
		let connection = await this.connect(store_name, 'readwrite')
		
		return new Promise((resolve, reject) => {
			for(let value of data_list) {
				connection.store.put(value)
			}

			connection.clean(() => resolve())
		})
	}

	async delete_data(id_list, store_name) { 
		let connection = await this.connect(store_name, 'readwrite')
		console.log('Delete ', id_list)
		return new Promise((resolve, reject) => {
			for(let id of id_list) {
				let query = connection.store.delete(id)
				query.onsuccess = (event) => console.log(event)
			}

			connection.clean(() => resolve() )
		})
	}
}

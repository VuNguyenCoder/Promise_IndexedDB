class Connection {
	constructor(db, transaction, store) {
		this.db = db 
		this.transaction = transaction 
		this.store = store 
	}
	close(callback = () => {}) { 
		this.transaction.oncomplete = () => {
			callback()
			this.db.close()
		}
	}
}

class PromiseIndexedDB {
	constructor(db_name, schema , version = 1, )
	{
		this.db_name = db_name 
		this.version = version
		this.schema = schema

		let request = indexedDB.open(this.db_name, this.version)
		request.onupgradeneeded = () => {
			let db = request.result
			for(let store_info of schema) {
				db.createObjectStore(store_info.store_name, 
									store_info.store_options)
			}
			db.close()
		}
	}

	open_db(store_name, mode = 'readonly') {
		return new Promise((resolve, reject) => {
			let request = indexedDB.open(this.db_name, this.version)

			request.onsuccess = () => {
				let db = request.result 
				let transaction = db.transaction(store_name, mode)
				let store = transaction.objectStore(store_name)
				resolve(new Connection(db, transaction, store))
			}

			request.onerror = () => {
				reject('CONNECTION_FAILED')
			}
		})
	}

	async connect(store_name, mode = 'readonly') {
		return new Promise((resolve, reject) => {
			this.open_db(store_name, mode)
				.then(connection => {
					console.log('Opened database successfully')
					resolve(connection)
				})
				.catch(err => {
					console.log('Opened database failed! Try again...')
					resolve(this.open_db(store_name, mode))
				})

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

			connection.close(() =>  resolve(data_list) )
		})
	}

	async update_data(data_list, store_name) { 
		let connection = await this.connect(store_name, 'readwrite')
		
		return new Promise((resolve, reject) => {
			for(let value of data_list) {
				connection.store.put(value)
			}

			connection.close(() => {
				console.log('Updated database successfully')
				resolve()
			})
		})
	}

	async delete_data(id_list, store_name) { 
		let connection = await this.connect(store_name, 'readwrite')

		return new Promise((resolve, reject) => {
			for(let id of id_list) {
				let query = connection.store.delete(id)
				query.onsuccess = (event) => console.log(event)
			}

			connection.close(() => {
				console.log('Delete data from database successfully')
				resolve()
			})
		})
	}
}

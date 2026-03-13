const VideoDB={
  DB_NAME:'dw_videos',DB_VERSION:1,STORE:'videos',
  open(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(this.DB_NAME,this.DB_VERSION);
      req.onupgradeneeded=(e)=>{
        const db=e.target.result;
        if(!db.objectStoreNames.contains(this.STORE)){
          db.createObjectStore(this.STORE,{keyPath:'id'});
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  },
  async save(id,blob){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(this.STORE,'readwrite');
      tx.objectStore(this.STORE).put({id,blob,savedAt:Date.now()});
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  },
  async get(id){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(this.STORE,'readonly');
      const req=tx.objectStore(this.STORE).get(id);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  },
  async remove(id){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(this.STORE,'readwrite');
      tx.objectStore(this.STORE).delete(id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }
};

// ===== APP =====

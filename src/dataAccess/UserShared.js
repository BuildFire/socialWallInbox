class UserShared {
    static get TAG(){
        return "usershared"
    }

    static isUserCusomer(email1, email2, cb) {
        let filter = {
            $and: [
                {
                    "_buildfire.index.array1": email1
                },
                {
                    "_buildfire.index.array1": email2
                },
            ]
        }

        buildfire.appData.search({ filter }, UserShared.TAG, (err, records) => {
            if (err) return cb(err);
            if (records && records[0]) return cb(null, true)
            return cb(null, false)
        })
    }
}

export default UserShared;

angular.module('starter.services', [])

    .factory('DB', function() {
        var positions = new GeoFire(new Firebase('https://donner-a-lyon.firebaseio.com/positions'));
        var removedPositions = new GeoFire(new Firebase('https://donner-a-lyon.firebaseio.com/removedPositions'));
        var products = new Firebase('https://donner-a-lyon.firebaseio.com/products');
        var removedProducts = new Firebase('https://donner-a-lyon.firebaseio.com/removedProducts');
        var users = new Firebase('https://donner-a-lyon.firebaseio.com/users');
        var main = new Firebase('https://donner-a-lyon.firebaseio.com/');

        return {
            positions       : positions,
            removedPositions: removedPositions,
            products        : products,
            removedProducts : removedProducts,
            users           : users,
            main            : main
        };
    })

    .factory('Auth', function(DB, $firebaseAuth) {
        return $firebaseAuth(DB.main);
    })

    .factory('Products', function($firebase, DB, $rootScope) {
        var factory = {};

        var oldLocation;
        var query;
        var defaultCriteria = {
            radius: 20
        };

        factory.items = [];

        var catchGeoEvents = function(query) {
            query.on('key_entered', function(key, location, distance) {
                var item = {
                    key     : key,
                    location: location,
                    distance: distance,
                    object  : {
                        priority: 0
                    }
                };

                DB.products.child(key).once('value', function(productSnap) {
                    item.object = productSnap.val();
                    if(item.object) {
                        item.object.priority = productSnap.getPriority() || 0;
                    }

                    factory.items.push(item);

                    $rootScope.$digest();
                });

                $rootScope.$digest();
            });

            query.on('key_exited', function(key) {
                _.remove(factory.items, function(item) {
                    return item.key === key;
                });
                $rootScope.$digest();
            });

            query.on('key_moved', function(key, location, distance) {
                var item = _.find(factory.items, function(item) {
                    return item.key === key;
                });

                item.location = location;
                item.distance = distance;
                $rootScope.$digest();
            });
        };

        factory.setLocation = function() {
            var location = $rootScope.currentLocation;
            var user = $rootScope.currentUser;

            if(location && user) {
                var criteria = angular.extend({}, defaultCriteria, {
                    center: [
                        location.latitude,
                        location.longitude
                    ]
                });

                if(!oldLocation) {
                    oldLocation = location;
                    query = DB.positions.query(criteria);
                    catchGeoEvents(query);
                } else {
                    query.updateCriteria(criteria);
                }
            }

        };

        return factory;
    })

    .factory('User', function(DB, $rootScope, Products, $q) {
        return {
            get: function(authData) {
                var deferred = $q.defer();

                DB.users.child(authData.uid).once('value', function(snap) {
                    $rootScope.currentUser = snap.val();
                    deferred.resolve($rootScope.currentUser);
                });

                return deferred.promise;
            }
        };
    })


    .factory('Location', function($q, $cordovaGeolocation, $ionicPlatform, $timeout) {
        var factory = {};

        var posOptions = {
            frequency         : 1000,
            timeout           : 10000,
            enableHighAccuracy: false
        };

        factory.currentPosition = {};

        var alreadyLocated = $q.defer();

        factory.update = function() {
            var deferred = $q.defer();

            $ionicPlatform.ready(function() {

                var timer;
                var watch = $cordovaGeolocation.watchPosition(posOptions);

                var final = function() {
                    factory.isSet = true;
                    deferred.resolve(factory.currentPosition);
                    alreadyLocated.resolve();

                    watch.cancel();
                    $timeout.cancel(timer);
                };

                timer = $timeout(final, 5000);

                watch.then(null, function(err) {

                    deferred.reject();
                    alert('Erreur de localisation');
                    log(err, 'err');

                    watch.cancel();

                }, function(position) {
                    factory.currentPosition = position.coords;

                    if(factory.currentPosition.accuracy < 50) {
                        final();
                    }
                });

            });

            return deferred.promise;
        };

        factory.locate = function() {
            return alreadyLocated.promise;
        };

        return factory;
    })


    .factory('Backend', function($q, $ionicPlatform, DB, Location, $rootScope) {
        var factory = {};

        var server = 'https://intense-river-1362.herokuapp.com/upload';// Heroku
        //var server = 'http://192.168.0.24:9000/upload';// Yann
        //var server = 'http://192.168.180.33:9000/upload';// Toon

        var Store = function(localPath) {
            var deferred = $q.defer();

            $ionicPlatform.ready(function() {

                var ft = new FileTransfer(),
                    options = new FileUploadOptions();

                options.fileKey = "file";
                options.fileName = localPath.split("/").pop(); // We will use the name auto-generated by Node at the server side.
                options.mimeType = "image/jpeg";
                options.chunkedMode = false;

                ft.upload(localPath, server, function(data) {
                    deferred.resolve(JSON.parse(data.response).path);
                }, function() {
                    deferred.reject();
                    alert("L'envoi a échoué");
                }, options);
            });

            return deferred.promise;
        };

        factory.removeProduct = function(product) {

            // TODO please...
            DB.products.child(product.key).once('value', function(snap) {
                var currentKey = product.key;
                var currentProduct = snap.val();

                DB.positions.get(currentKey).then(function(currentLocation) {

                    DB.positions.remove(currentKey).then(function() {
                        DB.removedPositions.set(currentKey, currentLocation).then(function() {
                            DB.products.child(product.key).remove(function() {
                                DB.removedProducts.child(currentKey).set(currentProduct, function() {
                                    DB.users.child($rootScope.currentUser.auth.uid + '/products/' + currentKey).remove(function() {
                                        DB.users.child($rootScope.currentUser.auth.uid + '/removedProducts/' + currentKey).set(true);
                                    });
                                });
                            });
                        });
                    });

                });
            });

        };

        factory.saveToFirebase = function(path) {
            var deferred = $q.defer();

            var id = path.split('/').pop().split('.')[0];

            var product = {
                imagePath: path,
                email    : $rootScope.currentUser.config.email,
                phone    : $rootScope.currentUser.config.phone,
                user     : $rootScope.currentUser.auth.uid,
                addDate  : new Date().getTime()
            };

            Location.locate().then(function() {
                var position = [Location.currentPosition.latitude, Location.currentPosition.longitude];

                var now = (new Date()).getTime();

                // Save product
                console.log('SAVE PRODUCT', id);
                DB.products.child(id).setWithPriority(product, now, function(err) {
                    if(!err) {
                        console.log('PRODUCT SAVED');

                        console.log('SAVE POSITION');
                        // Save geolocation
                        DB.positions.set(id, position).then(function() {
                            console.log('POSITION SAVED');

                            console.log('ADD PRODUCT TO USER');
                            DB.users.child($rootScope.currentUser.auth.uid + '/products/' + id).set(true, function(err) {
                                if(err) {
                                    deferred.reject();
                                    console.log('ADD PRODUCT TO USER ERROR');
                                } else {
                                    console.log('PRODUCT ADDED TO USER');
                                    deferred.resolve();
                                }

                            });
                        }, function() {
                            console.log('POSITION ERROR');
                            deferred.reject();
                        });
                    } else {
                        deferred.reject();
                    }
                });
            });

            return deferred.promise;
        };

        factory.uploadPicture = Store;

        return factory;
    })


    .factory('Camera', function($cordovaCamera, $q) {
        var factory = {};

        //var popover = new CameraPopoverOptions(0, 0, 500, 500, Camera.PopoverArrowDirection.ARROW_ANY);

        var defaultConfig = {
            quality         : 75,
            destinationType : Camera.DestinationType.FILE_URI,
            allowEdit       : true,
            encodingType    : Camera.EncodingType.JPEG,
            targetWidth     : 500,
            targetHeight    : 500,
            saveToPhotoAlbum: false/*,
            popoverOptions  : popover*/

        };

        factory.choosePicture = function() {
            var deferred = $q.defer();

            if(angular.isDefined(window.Camera)) {
                var options = angular.extend({}, defaultConfig, {
                    sourceType: Camera.PictureSourceType.PHOTOLIBRARY
                });

                //navigator.camera.getPicture(deferred.resolve, deferred.reject, options);
                $cordovaCamera.getPicture(options).then(deferred.resolve, deferred.reject);
            } else {
                deferred.reject();
            }

            return deferred.promise;
        };

        factory.takePicture = function() {
            var deferred = $q.defer();

            if(angular.isDefined(window.Camera)) {
                var options = angular.extend({}, defaultConfig, {
                    sourceType: Camera.PictureSourceType.CAMERA
                });

                //navigator.camera.getPicture(deferred.resolve, deferred.reject, options);
                $cordovaCamera.getPicture(options).then(deferred.resolve, deferred.reject);
            } else {
                deferred.reject();
            }

            return deferred.promise;
        };

        return factory;
    });

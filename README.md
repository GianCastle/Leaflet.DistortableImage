# Leaflet.DistortableImage

[![Build Status](https://travis-ci.org/publiclab/Leaflet.DistortableImage.svg?branch=master)](https://travis-ci.org/publiclab/Leaflet.DistortableImage)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/publiclab/Leaflet.DistortableImage/issues)
[![npm version](https://badge.fury.io/js/leaflet-distortableimage.svg)](https://badge.fury.io/js/leaflet-distortableimage)

A Leaflet extension to distort images -- "rubbersheeting" -- for the [MapKnitter.org](http://mapknitter.org) ([src](https://github.com/publiclab/mapknitter)) image georectification service by [Public Lab](http://publiclab.org). Leaflet.DistortableImage allows for perspectival distortions of images, client-side, using CSS3 transformations in the DOM.

Advantages include:

* It can handle over 100 images smoothly, even on a smartphone
* Images can be right-clicked and downloaded individually in their original state
* CSS3 transforms are GPU-accelerated in most (all?) browsers, for a very smooth UI
* No need to server-side generate raster GeoTiffs, tilesets, etc. in order to view distorted imagery layers
* Images use DOM event handling for real-time distortion
* [Full resolution download option](https://github.com/publiclab/Leaflet.DistortableImage/pull/100) for large images, using WebGL acceleration

[Download as zip](https://github.com/publiclab/Leaflet.DistortableImage/releases) or clone the repo to get a local copy.

Also available on NPM as [leaflet-distortableimage](https://www.npmjs.com/package/leaflet-distortableimage).

## Setup

* From the root directory, run `npm install` or `sudo npm install`

## Demo

Check out this [simple demo](https://publiclab.github.io/Leaflet.DistortableImage/examples/index.html).

And watch this GIF demo:

![demo gif](https://raw.githubusercontent.com/publiclab/mapknitter/master/public/demo.gif)

To test the code, open `index.html` in your browser and click and drag the markers on the edges of the image. The image will show perspectival distortions.

For the additional features in the [multiple image interface](#Multiple-Image-Interface), open `select.html` and use <kbd>shift</kbd> + click on an image or <kbd>shift</kbd> + drag on the map to "multi-select" images. For touch screens, touch + hold the image.

## Single Image Interface

The simplest implementation is to create a map with our recommended `TileLayer`, then create an `L.distortableImageOverlay` instance and add it onto the map.

```JS
// set the initial map center and zoom level
map = L.map('map').setView([51.505, -0.09], 13);

// adds a Google Satellite layer with a toner label overlay
map.addGoogleMutant();

map.whenReady(function() {
  // By default, 'img' will be placed centered on the map view specified above
  img = L.distortableImageOverlay('example.jpg').addTo(map);
});
```

<b>Note</b>: <code>map.addGoogleMutant()</code> is just a convenience function for adding our recommended layer to the map. If you want a different baselayer, skip this line and add your preferred layer to the map as you normally would. For ex:

```JS
L.tileLayer('https://{s}.tiles.mapbox.com/v3/anishshah101.ipm9j6em/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
  id: 'examples.map-i86knfo3'
}).addTo(map);
```

**Options** available to pass during `L.DistortableImageOverlay` initialization:

* [actions](#Actions)
* [corners](#corners)
* [editable](#editable)
* [fullResolutionSrc](#Full-resolution%20download)
* [mode](#mode)
* [selected](#selected)
* [suppressToolbar](#Suppress-Toolbar)

### Actions

* `actions` (*optional*, default: [ToggleTransparency, ToggleOutline, ToggleLock, ToggleRotateScale, ToggleOrder, Revert, Export, Delete], value: *array*)

If you would like to overrwrite the default toolbar actions available for an individual image's `L.Popup` toolbar, pass an array with the actions you want. Reference the available values [here](#Single-Image-Interface).

For example, to overrwrite the toolbar to only include the `ToggleTransparency` and `Delete` actions, and also add on the additional `ToggleScale` action:

``` JS
img = L.distortableImageOverlay('example.jpg', {
  actions: [ToggleTransparency, ToggleScale, Delete],
}).addTo(map);
```

### Corners

* `corners` (*optional*, default: an array of `LatLang`s that position the image on the center of the map, value: *array*)

Allows you to set an image's position on the map manually (somewhere other than center).

They should be passed as an array of `L.latLng` objects in NW, NE, SW, SE order (in a "Z" shape).

This will not have an effect on the map view, but it will determine the shape and dimensions of the rendered image.

They will be stored on the image. See the [Quick API Reference](#Quick-API-Reference) for their getter and setter methods.

Example:

```js
img = L.distortableImageOverlay('example.jpg', {
  corners: [
    L.latLng(51.52,-0.14),
    L.latLng(51.52,-0.10),
    L.latLng(51.50,-0.14),
    L.latLng(51.50,-0.10)
  ],
}).addTo(map);

// you can grab the initial corner positions
JSON.stringify(img.getCorners())
=> "[{"lat":51.52,"lng":-0.14},{"lat":51.52,"lng":-0.1},{"lat":51.5,"lng":-0.14},{"lat":51.5,"lng":-0.1}]"

// ...move the image around...

// you can check the new corner positions.
JSON.stringify(img.getCorners())
=> "[{"lat":51.50685099607552,"lng":-0.06058305501937867},{"lat":51.50685099607552,"lng":-0.02058595418930054},{"lat":51.486652692081925,"lng":-0.06058305501937867},{"lat":51.486652692081925,"lng":-0.02058595418930054}]"

// note there is an added level of precision after dragging the image
```

### Editable

`editable` (*optional*, default: true, value: *boolean*)

Internally, we use the image `load` event to trigger a call to `img.editing.enable()`, which sets up the editing interface (makes the image interactive, adds markers and toolbar).

For a scenario where you want to allow editing based on custom logic, you can pass `editable: false` and then write your own function with a call to `img.editing.enable()`. Other passed options such as `selected: true` and `mode` will still be applicable and applied then.

<blockquote><b>Note</b>: when using the multiple image interface (<code>L.DistortableCollection</code>) this option will be ignored on individual <code>L.DistortableImageOverlay</code> instances and should instead be passed to the collection instance.</blockquote>

### Full-resolution download

`fullResolutionSrc` (*optional*)

We've added a GPU-accelerated means to generate a full resolution version of the distorted image; it requires two additional dependencies to enable; see how we've included them in the demo:

```HTML
<script src="../node_modules/webgl-distort/dist/webgl-distort.js"></script>
<script src="../node_modules/glfx/glfx.js"></script>
```

When instantiating a Distortable Image, pass in a `fullResolutionSrc` option set to the url of the higher resolution image. This image will be used in full-res exporting.

```JS
img = L.distortableImageOverlay('example.jpg', {
  fullResolutionSrc: 'large.jpg',
}).addTo(map);
```

### Mode

`mode` (*optional*, default: "distort", value: *string*)

Each primary editing mode corresponds to a separate editing handle.

This option sets the image's initial editing mode, meaning the corresponding editing handle will always appear first when you interact with the image.

Values available to pass to `mode` are:

* **distort** (*default*): Distortion via individually draggable corners.
* **rotate**: Rotation only.
* **scale**: Resize only.
* **rotateScale**: Free transform. Combines the rotate and scale modes into one.
* **lock**: Locks the image in place. Prevents moving it via user gestures, toolbar actions, and hotkeys until the toolbar action ToggleLock is explicitly triggered (or its hotkey <kbd>l</kbd>).

In the below example, the image will be initialiazed with "rotateScale" handles:

```JS
img = L.distortableImageOverlay('example.jpg', {
  mode: 'rotateScale',
}).addTo(map);
```

### Selected

`selected` (*optional*, default: false, value: *boolean*)

By default, your image will initially appear on the screen as "unselected", meaning its toolbar and editing handles will not be visible. Interacting with the image, such as by clicking it, will make these components visible.

Some developers prefer that an image initially appears as "selected" instead of "unselected". In this case, we provide an option to pass `selected: true`.

Note: when working with the multi image interface, only the last overlay you pass `selected: true` to will appear with editing handles _and_ a toolbar.

### Suppress Toolbar

`suppressToolbar` (*optional*, default: false, value: *boolean*)

To initialize an image without its `L.Popup` instance toolbar, pass it `suppressToolbar: true`.

Typically, editing actions are triggered through our toolbar interface. If disabling the toolbar, the developer will need to implement their own toolbar UI connected to our actions (WIP API for doing this)

## Multiple Image Interface

Our `DistortableCollection` class allows working with multiple images simultaneously. This interface builds on the single image interface.

The setup is relatively similar.

Although not required, you will probably want to pass `corners` to individual images when adding multiple or they will be positioned on top of eachother.

here is an example with two images:

```JS
// 1. Instantiate map
// 2. Instantiate images but this time *dont* add them directly to the map
img = L.distortableImageOverlay('example.jpg', {
  corners: [
    L.latLng(51.52, -0.14),
    L.latLng(51.52,-0.10),
    L.latLng(51.50, -0.14),
    L.latLng(51.50,-0.10)
  ],
});

img2 = L.distortableImageOverlay('example.jpg', {
  corners: [
    L.latLng(51.51, -0.20),
    L.latLng(51.51,-0.16),
    L.latLng(51.49, -0.21),
    L.latLng(51.49,-0.17)
  ],
});

// 3. Instantiate an empty `DistortableCollection` group
imgGroup = L.distortableCollection().addTo(map);

// 4. Add the images to the group
imgGroup.addLayer(img);
imgGroup.addLayer(img2);
```

<blockquote><strong>Note</strong>: You must instantiate a blank collection, then dynamically add layers to it like above. This is because <code>DistortableCollection</code> uses the <code>layeradd</code> event to enable additional editing features on images as they are added, and it is only triggered when they are added dynamically.</blockquote>


Options available to pass during `L.DistortableCollection` initialization:

* [actions](#✤-Actions)
* [editable](#✤-editable)
* [supressToolbar](#✤-)

### ✤ Actions

* `actions` (*optional*, default: [Exports, Deletes, Locks, Unlocks], value: *array*)

Overrwrite the default toolbar actions for an image collection's `L.Control` toolbar. Reference the available values [here](#Multiple-Image-Interface).

For example, to overrwrite the toolbar to only include the `Deletes` action:

```JS
imgGroup = L.distortableCollection({
  actions: [Deletes],
}).addTo(map);
```

To add / remove a tool from the toolbar at runtime, we have also added the methods `addTool(action)` and `removeTool(action)`.

### ✤ Editable

`editable` (*optional*, default: true, value: *boolean*)

See [editable](#editable).

### ✤ Suppress Toolbar

`suppressToolbar` (*optional*, default: false, value: *boolean*)

Same usage as [suppressToolbar](#Suppress-Toolbar), but for the collection group's `L.Control` toolbar instance.

This provides the developer with the flexibility to keep the popup toolbars, the control toolbar, both, or neither.

For ex.

```JS
// suppress this images personal toolbar
img = L.distortableImageOverlay('example.jpg', {
  suppressToolbar: true,
  corners: [
    L.latLng(51.52, -0.14),
    L.latLng(51.52,-0.10),
    L.latLng(51.50, -0.14),
    L.latLng(51.50,-0.10)
  ],
});

// suppress the other images personal toolbar
img2 = L.distortableImageOverlay('example.jpg', {
  suppressToolbar: true,
});

// suppress collection toolbar accessed during multi-image selection
imgGroup = L.distortableCollection({
  supressToolbar: true,
}).addTo(map);
```

### UI and functionalities

Currently it supports multiple image selection and translations, and WIP we are working on porting all editing tools to work for it, such as transparency, etc. Image distortions still use the single-image interface.

**multi-select:** A single toolbar instance (using `L.control`) renders the set of tools available to use on collections of images.

1. Multi-selection works with <kbd>shift</kbd> + `click` to toggle an individual image's inclusion in this interface.
2. Or <kbd>shift</kbd> + `drag` to use our `BoxSelector` handler to select multiple at once.
3. Or for touch devices, `touch` + `hold` (aka `longpress`).

**un-multi-select:**

* In order to return to the single-image interface, where each `L.popup` toolbar only applies actions on the image it's attached to, you must toggle *all* images out of multi-select or...
* ...Click on the map or hit the <kbd>esc</kbd> key to quickly deselect all images.
* For the aforementioned 3 mutli-select methods, the `BoxSelector` method is the only one that doesn't also toggle _out_ of multi-select mode.

---

## Toolbar Actions (& Keybindings)

---

### Single Image Interface

---

Defaults:

* **ToggleLock (<kbd>l</kbd>)**
  * Toggles between `lock` mode and `distort` mode.
* **ToggleRotateScale (<kbd>r</kbd>, <kbd>d</kbd>)**
  * Toggles between `rotateScale` and `distort` mode.
* **ToggleOrder (<kbd>j</kbd>, <kbd>k</kbd>)**
  * If you have multiple images, use this to switch an individual image's overlap back and forth into view. Employs [`bringToFront()`](https://leafletjs.com/reference-1.5.0.html\#imageoverlay-bringtofront) and [`bringToBack()`](https://leafletjs.com/reference-1.5.0.html#imageoverlay-bringtoback) from the Leaflet API.
* **ToggleOutline (<kbd>o</kbd>)**
* **ToggleTransparency (<kbd>t</kbd>)**
* **Revert**
  * Restores the image to its original proportions and scale, but keeps its current rotation angle and location on the map intact.
* **Export**
* **Delete (<kbd>delete</kbd>, <kbd>backscpace</kbd>)**
  * Permanently deletes the image from the map.

 Addons:

* **ToggleRotate** (<kbd>caps lock</kbd>):
  * Toggles between `rotate` mode and `distort` mode.
  * Replaced as a default toolbar action by `ToggleRotateScale`, but still accessible via its hotkey, `mode`, and (WIP) custom toolbar actions API.
* **ToggleScale** (<kbd>s</kbd>):
  * Toggles between `scale` mode and `distort` mode.
  * Replaced as a default toolbar action by `ToggleRotateScale`, but still accessible via its hotkey, `mode`, and (WIP) custom toolbar actions API.
* **EnableEXIF (WIP)**

---

### Multiple Image Interface

---

Defaults:

* **Exports** (WIP)
* **Deletes (<kbd>delete</kbd>, <kbd>backspace</kbd>)**
  * Permanently deletes groups of selected images from the map. Uses a `confirm()` modal dialog.
* **Locks** (<kbd>l</kbd>)
* **Unlocks** (<kbd>u</kbd>)

## Quick API Reference

---

`L.Map`

---

We have extended Leaflet's `L.Map` to include a convenience method for this library:

<details><summary><code><b>addGoogleMutant(<i>opts?</i> &#60;Mutant options>)</b>: this</code></summary>
  <ul>
    <li>Adds a Google Mutant layer with location labels according to our recommended setup.</li>
    <li>Label visibility is toggled by double clicking on the map.</li>
    <li><b>Mutant options</b>: {
      <ul>
        <li><i>labels</i>: &#60;boolean>, default: true</li>
        <ul>
          <li>If set to <code>false</code>, the mutant layer will not have location labels</li>
        </ul>
        <li><i>labelOpacity</i>: &#60;number 0, 1>, default: 0</li>
        <ul>
          <li>If set to <code>1</code>, labels will be initially visible</li>
        </ul>
        <li><i>mutantOpacity</i>: &#60;number 0..1>, default: 0.8</li>
        <ul>
          <li>Same as Leaflet's <code>L.TileLayer</code> <code>opacity</code> option</li>
        </ul>
        <li><i>maxZoom</i>: &#60;number 0..21>, default: 18</li>
        <ul>
          <li>Same as Leaflet's <code>L.TileLayer</code> <code>maxZoom</code> option, except has a maximum value of 21 because higher zoom levels on the mutant layer will result in an error being thrown.</li>
          <li>The mutant layer will appear blurry for zoom levels exceeding 18.</li>
        </ul>
        <li><i>minZoom</i>: &#60;number 0..maxZoom>, default: 0</li>
        <ul>
          <li>Same as Leaflet's <code>L.TileLayer</code> <code>maxZoom</code> option</li>
        </ul>
      </ul>
    }</li>
  </ul>
</details>
<br>
And the following custom handlers:
<br><br>

<details><summary><code><b>doubleClickLabels</b>: this</code></summary>
  <ul>
    <li>When location labels are added via <code>#addGoogleMutant</code>, this handler is enabled by default to allow toggling their visibility by double clicking on the map.</li>
    <li>Afterwards, can be enabled / disabled during runtime via <a href="https://leafletjs.com/reference-1.5.0.html#handler">Leaflet's Handler API</a>.</li>
    <li>Overrides the map's default <a href="https://leafletjs.com/reference-1.5.0.html#map-doubleclickzoom"><code>doubleClickZoom</code></a> handler when enabled. When disabled, automatically re-enables it.</li>
  </ul>
</details>

<details><summary><code><b>boxSelector</b>: this</code></summary>
  <ul>
    <li>Overrides the map's default <a href="https://leafletjs.com/reference-1.5.0.html#map-boxzoom"><code>boxZoom</code></a> handler.</li>
    <li>Allows multiple images to be selected when <kbd>shift</kbd> + <code>drag</code>ing on the map in the multiple-image inerface.</li>
  </ul>
</details>
<br>
We have made slight changes to a default Leaflet handler:
<br><br>
<details><summary><code><b>doubleClickZoom</b>: this</code></summary>
<ul>
  <li>This handler and <code>doubleClickLabels</code> time and fire a custom <code>singleclick</code> event on map click. It is fired after a 3ms timeout if the click doesn't become a doubleclick.</li>
  <li>This allows our images to remain selected during associated double click events on the map (in this case zooming).</li>
  <li>Our image classes listen for <code>singleclick</code> while either this or the other doubleClick handler is enabled.</li>
</ul>
</details>

---

`L.DistortableImageOverlay`

---

<details><summary><code><b>getCorner(<i>idx</i> &#60;number 0..3>)</b>: LatLng</code></summary>
  <ul><li>Returns the coordinates of the image corner at <i>index</i>.</li></ul>
</details>

<details><summary><code><b>getCorners()</b>: 4 [LatLng, LatLng, LatLng, LatLng]</code></summary>
  <ul><li>Returns the coordinates of the image corners in NW, NE, SW, SE order.</li></ul>
</details>

<details><summary><code><b>setCorner(<i>idx</i> &#60;number 0..3>, <i>LatLng</i>)</b>: this</code></summary>
  <ul>
    <li>Updates the coordinates of the image corner at <i>index</i> to <i>LatLng</i> and, where applicable, marker and toolbar positioning.</li>
    <li>We use this internally for <code>distort</code> mode.</li>
  </ul>
</details>

<details><summary><code><b>setCorners(<i>corners</i>)</b>: this</code></summary>
  <ul>
    <li>Same as <code>#setCorner</code>, but takes in a "corners" object to update all 4 corners with only one UI update at the end.</li>
    <li>We use this internally for image translation, rotation, and scaling.</li>
    <li><i>corners</i>: { <i>keys</i>: &#60;number 0..4>, <i>values</i>: LatLng } <br>
  ex.

<pre>
var scaledCorners = {0: '', 1: '', 2: '', 3: ''},
    i, p;

for (i = 0; i < 4; i++) {
  p = map
    .project(img.getCorner(i))
    .subtract(center)
    .multiplyBy(scale)
    .add(center);
  scaledCorners[i] = map.unproject(p);
}

img.setCorners(scaledCorners);
</pre></li>
  </ul>
</details>

<details><summary><code><b>getCenter()</b>: LatLng</code></summary>
  <ul><li>Returns the center (<a href="http://en.wikipedia.org/wiki/Centroid">centroid</a>) of the image.</li></ul>
</details>

<details><summary><code><b>scaleBy(<i>factor</i> &#60;number>)</b>: this</code></summary>
  <ul>
    <li>Scales the image by the given factor and calls <code>#setCorners</code>.</li>
    <li>A scale of 0 or 1 will leave the image unchanged - but 0 causes the function to automatically return.</li>
    <li>A negative scale will invert the image and, depending on the factor, change its size.</li>
    <li>Ex. <code>img.scaleBy(0.5)</code></li>
  </ul>
</details>

<details><summary><code><b>rotateBy(<i>rad</i> &#60;number>)</b>: this</code></summary>
  <ul><li>Rotates the image by the given radian angle and calls <code>#setCorners</code>.</li></ul>
</details>

---

`L.DistortableImageOverlay.Edit`

---

A handler that holds the keybindings and toolbar API for an image instance. It is always initialized with an instance of `L.DistortableImageOverlay`. Besides code organization, it provides the ability to `enable` and `disable` image editing using the Leaflet API.

<blockquote><b>Note</b>: The main difference between the <code>enable</code> / <code>disable</code> runtime API and using the <code>editable</code> option during initialization is in runtime, neither individual image instaces nor the collection group get precedence over the other.</blockquote>

<details><summary><code><b>enable()</b>: this</code></summary>
  <ul>
    <li>Sets up the editing interface (makes the image interactive, adds markers and toolbar).</li>
    <li>Called internally by default (<a href="#editable">editable</a>), but unlike the option it can be used in runtime and is not ignored if there is a collection group. In fact...</li>
    <li>...An individual image can be enabled while the group is disabled. i.e. calling <code>img.editing.enable()</code> after <code>imgGroup.editing.disable()</code> is valid. In this case, the single image interface will be available on this image but not the multi-image interface.</li>
  </ul>
</details>

<details><summary><code><b>disable()</b>: this</code></summary>
  <ul>
    <li>Removes the editing interface (makes the image non-interactive, removes markers and toolbar).</li>
    <li>Called internally by default on image deletion.</li>
    <li>An individual image can be disabled while the group is enabled.</li>
  </ul>
</details>

<details><summary><code><b>enabled()</b>: Boolean</code></summary>
  <ul>
    <li>Returns true if editing on the individual image instance is enabled.</li>
    <li><code>img.editing.enabled()</code></li>
  </ul>
</details>

---

`L.DistortableCollection`

<details><summary><code><b>isSelected(<i>img</i> &#60;DistortableImageOverlay>)</b>: Boolean</code></summary>
<ul><li>Returns true if the passed <code>DistortableImageOverlay</code> instance is multi-selected, i.e. its underlying <code>HTMLImageElement</code> has a class containing "selected".</li></ul>
</details>

<details><summary><code><b>anySelected()</b>: Boolean</code></summary>
<ul><li>Returns true if any <code>DistortableImageOverlay</code> instances are mutli-selected.</li></ul>
</details>

---

`L.DistortableCollection.Edit`

---

Same as `L.DistortableImage.Edit` but for the collection (`L.DistortableCollection`) instance.

<details><summary><code><b>enable()</b>: this</code></summary>
  <ul>
    <li>Sets up the multi-editing interface.</li>
    <li>Called internally by default, see <a href="#editable"> editable</a>.</li>
    <li>Calls each individual image's <code>#enable</code> method and then enables the multi-image interface.</li>
  </ul>
</details>

<details><summary><code><b>disable()</b>: this</code></summary>
  <ul>
    <li>Removes the editing interface (makes the image non-interactive, removes markers and toolbar).</li>
    <li>Called internally by default on image group deletion, but can also be used for custom behavior.</li>
    <li>Calls each individual image's <code>#disable</code> method and disables the multi-image interface.</li>
  </ul>
</details>

<details><summary><code><b>enabled()</b>: Boolean</code></summary>
  <ul>
    <li>Returns true if editing on the collection instance is enabled.</li>
    <li><code>imgGroup.editing.enabled()</code></li>
  </ul>
</details>

<details><summary><code><b>removeTool(<i>action</i> &#60;EditAction>)</b></code></summary>
  <ul>
    <li>Removes the passed tool from the control toolbar in runtime.</li>
    <li>ex: <code>imgGroup.removeTool(Deletes)</code></li>
  </ul>
</details>

<details><summary><code><b>addTool(<i>action</i> &#60;EditAction>)</b></code></summary>
<ul><li>Adds the passed tool to the end of the control toolbar in runtime. Returns false if the tool is not available or is already present.</li></ul>
</details>

<details><summary><code><b>hasTool(<i>action</i> &#60;EditAction>)</b>: Boolean</code></summary>
<ul><li>Returns true if the tool is present in the currently rendered control toolbar.</li></ul>
</details>

## Additional Components

### Keymapper

```JS
// add a position option with combinations of 'top', 'bottom', 'left' or 'right'
L.distortableImage.keymapper(map, {
  position: 'topleft',
});
```

Options:

* `position` (*optional*, default: 'topright', value: *string*)

Adds a control onto the map which opens a keymapper legend showing the available key bindings for different editing / interaction options.

(WIP) Currently includes keybindings for all available actions and does not update yet if you use the `actions` API to limit available actions.

## Contributing

There are [plenty of outstanding issues to resolve](https://github.com/publiclab/Leaflet.DistortableImage/issues). Please consider helping out!

1. This project uses `grunt` to do a lot of things, including concatenate source files from `/src/` to `/DistortableImageOverlay.js`:

```Bash
$ npm install

# install leaflet peer dependency locally
$ npm install leaflet --no-save

# It'll watch for changes and concatenate them on the fly
$ grunt
```

2. To build all files from `/src/` into the `/dist/` folder, run:

```Bash
$ grunt concat:dist
```

3. _Optional_: We use SVG for our icon system. Please visit our wiki [SVG Icon System](https://github.com/publiclab/Leaflet.DistortableImage/wiki/SVG-Icon-System) if you are interested in making updates to them or just simply learning about our workflow.

---

### Contributors

* Anish Shah, [@anishshah101](https://github.com/anishshah101)
* Justin Manley, [@manleyjster](https://github.com/manleyjster)
* Jeff Warren, [@jywarren](https://github.com/jywarren)
* Sasha Boginsky, [@sashadev-sky](https://github.com/sashadev-sky)
* Pranshu Srivastava, [@rexagod](https://github.com/rexagod)

Many more at https://github.com/publiclab/Leaflet.DistortableImage/graphs/contributors
﻿

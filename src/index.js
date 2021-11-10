import html2canvas from "./html2canvas";
console.log(html2canvas);

let box2 = document.getElementById("box2");
let date = new Date();
let timestamp = date.getTime();
let max = 20;
async function renderList1() {
    for (let i = 0; i < max; i++) {
        let elementStr = `<div class="bosgeo-iconContainer1">
                                <div class="bosgeo-icon1_name">
                                    <div class="bosgeo-icon1_name_content"></div>
                                </div>
                                <div class="bosgeo-icon1_labelIconBox">
                                    <div class="bosgeo-icon1_labelIcon"></div>
                                </div>
                                <div class="bosgeo-icon1_labelIconLine"></div>
                            </div>`;
        let width = 184;
        let height = 140;
        let elementData = {
            elementStr,
            width,
            height
        };
        let textNodeClassAndContent = {
            className: "bosgeo-icon1_name_content",
            content: "图标标签" + (i + 1)
        };
        let canvas = await html2canvas.render(elementData, [textNodeClassAndContent], {
            backgroundColor: "transparent"
        });
        // canvas.style.transform = 'scale(1.1)'
        // canvas.style.transformOrigin = 'bootom'
        document.body.appendChild(canvas);
        // .then(function(canvas) {
        //     // let date2 = new Date()
        //     // let timestamp2 = date2.getTime()
        //     // console.log('html2canvas',timestamp2-timestamp);
        //     console.log(html2canvas.cacheArr.length);
        // });
    }
}
async function renderList2() {
    for (let i = 0; i < max; i++) {
        let elementStr = `<div class="bosgeo-titleBack3">
                            <div class="bosgeo-title_name bosgeo-title_name3"></div>
                            <div class="bosgeo-title_content bosgeo-title_content3"></div>
                          </div>`;
        let width = 282;
        let height = 213;
        let elementData = {
            elementStr,
            width,
            height
        };
        let textNodeClassAndContentArr = [
            {
                className: "bosgeo-title_name bosgeo-title_name3",
                content: "标题标签" + (i + 1)
            },
            {
                className: "bosgeo-title_content bosgeo-title_content3",
                content: "标题标签内容ddddddddddddddddddddddddddddddddd" + (i + 1)
            }
        ];
        let canvas = await html2canvas.render(elementData, textNodeClassAndContentArr, {
            backgroundColor: "transparent"
        });
        document.body.appendChild(canvas);
        // .then(function(canvas) {
        //     // let date2 = new Date()
        //     // let timestamp2 = date2.getTime()
        //     // console.log('html2canvas',timestamp2-timestamp);
        //     console.log(html2canvas.cacheArr.length);
        // });
    }
}
async function renderList3() {
    for (let i = 0; i < max; i++) {
        let elementStr = `<div class="bosgeo-iconContainer4">
                            <div class="bosgeo-icon4_labelIconBox">
                                <div class="bosgeo-icon4_labelIcon"></div>
                            </div>
                            <div class="bosgeo-icon4_name"></div>
                          </div>`;
        let width = 210;
        let height = 50;
        let elementData = {
            elementStr,
            width,
            height
        };
        let textNodeClassAndContent = {
            className: "bosgeo-icon4_name",
            content: "图标标签" + (i + 1)
        };
        let canvas = await html2canvas.render(elementData, [textNodeClassAndContent], {
            backgroundColor: "transparent"
        });
        document.body.appendChild(canvas);
        // .then(function(canvas) {
        //     // let date2 = new Date()
        //     // let timestamp2 = date2.getTime()
        //     // console.log('html2canvas',timestamp2-timestamp);
        //     console.log(html2canvas.cacheArr.length);
        // });
    }
}
renderList1();
// renderList2();
// renderList3();
// setTimeout(() => {
//     html2canvas.destoryCache()
// }, 1000);

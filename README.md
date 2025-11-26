# 胡桃工具箱数据导出工具

基于HTML/JS实现的胡桃工具箱数据导出工具。

抽卡数据来自于Starward项目，感谢其作者Scighost。

## 使用方法

1. 直接访问<https://tsukkomi.org/snap_hutao_export>使用。
2. 安装Node.js，克隆本仓库后，运行`npm install`安装依赖，再运行`npm run build`构建文件，生成的文件会自动部署到`public/`目录下，将此目录下的文件放到HTTP服务器上访问使用。

## 版本更新

* 1.0.0  
  完善多语言支持。  
  已基本实现预期功能，之后将进入维护期。
* 0.3.0  
  对多语言导出的初步支持。
* 0.2.0  
  增加抽卡数据导出功能。
* 0.1.0  
  初始版本。

## 未来计划

1. ~~增加深渊数据导出功能；~~ 因没有统一的标准，暂时搁置此功能开发，可参见下面的“其他工具”；

## 其他工具

抽卡记录和深渊数据可以使用工具来导出到Startward启动器。

* Starward：<https://github.com/Scighost/Starward>
* SnapHutaoExpoter：<https://github.com/Scighost/SnapHutaoExporter>


# Sanp Hutao data export tool

A tool based on HTML/JS to exporting Snap Hutao data.

## Usage

1. Visit <https://tsukkomi.org/snap_hutao_export> to use.
2. Install Node.js. Clone this respository. Run `npm install` to install dependencies. Run `npm run build` to build files. Built files will be put into `public/` directory, copy them to a HTTP server and visit to use.

## Versions

* 1.0.0
  Add feature: multi-lingual support implemented.  
  Expected features implemented, now in maintenance phase.
* 0.3.0  
  Add feature: Very early implementation for multi-lingual support.
* 0.2.0  
  Add feature: Gacha data exporting.
* 0.1.0  
  First version.

## Future plans

1. ~~Spiral Abyss, Imaginarium Theater and Stygian Onslaught data exporting;~~ Due to no standard format for these data exchanging, this feature won't be developed for now. Other tools can be used for this purpose are listed below.

## Other tools

Gacha data and Spiral Abyss, Imaginarium Theater and Stygian Onslaught data can be exported to the Starward launcher using the following tools:

* Starward：<https://github.com/Scighost/Starward>
* SnapHutaoExpoter：<https://github.com/Scighost/SnapHutaoExporter>

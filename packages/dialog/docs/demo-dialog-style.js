import { css } from '@lion/core';

export default css`
  .demo-box {
    width: 200px;
    background-color: white;
    border-radius: 2px;
    border: 1px solid grey;
    padding: 8px;
  }

  .demo-box_placements {
    display: flex;
    flex-direction: column;
    margin-top: 20px;
  }

  lion-dialog {
    display: block;
    padding: 10px;
    margin-bottom: 10px;
  }

  .close-button {
    color: black;
    font-size: 28px;
    line-height: 28px;
  }

  .demo-box__column {
    display: flex;
    flex-direction: column;
  }

  .dialog {
    display: block;
    position: absolute;
    font-size: 16px;
    color: white;
    background-color: black;
    border-radius: 4px;
    padding: 8px;
  }
`;
